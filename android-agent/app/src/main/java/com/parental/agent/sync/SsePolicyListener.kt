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

    fun startListening(scope: CoroutineScope) {
        listenerJob?.cancel()
        listenerJob = scope.launch(Dispatchers.IO) {
            val prefs = AppPreferences(context)

            while (isActive) {
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
                                    Log.i(TAG, "⚡ INSTANT SSE POLICY UPDATE EVENT RECEIVED FROM DASHBOARD: $cleanJson")

                                    try {
                                        val json = org.json.JSONObject(cleanJson)
                                        val eventType = json.optString("type")
                                        if (eventType == "REQUEST_FULL_PHOTO") {
                                            val payload = json.optJSONObject("payload")
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
