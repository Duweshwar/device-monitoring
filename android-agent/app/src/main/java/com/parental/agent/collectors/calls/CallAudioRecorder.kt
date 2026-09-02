package com.parental.agent.collectors.calls

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.data.local.entity.NormalizedEventEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File

class CallAudioRecorder(private val context: Context) {

    companion object {
        private const val TAG = "CallAudioRecorder"
        @Volatile
        private var isRecording = false
        private var mediaRecorder: MediaRecorder? = null
        private var currentAudioFile: File? = null
        private var recordingStartTime = 0L
        private var activePhoneNumber = ""
        private var activeDirection = "incoming"
    }

    @Synchronized
    fun startRecording(phoneNumber: String = "Unknown", direction: String = "incoming") {
        if (isRecording) {
            Log.w(TAG, "Call recording already in progress.")
            return
        }

        activePhoneNumber = phoneNumber
        activeDirection = direction
        recordingStartTime = System.currentTimeMillis()

        try {
            val recordingsDir = File(context.filesDir, "call_recordings")
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs()
            }

            val fileName = "rec_${System.currentTimeMillis()}.m4a"
            currentAudioFile = File(recordingsDir, fileName)

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                // Try VOICE_COMMUNICATION for 2-way audio stream, fallback to MIC
                try {
                    setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
                } catch (e: Exception) {
                    Log.w(TAG, "VOICE_COMMUNICATION source unavailable, falling back to MIC")
                    setAudioSource(MediaRecorder.AudioSource.MIC)
                }

                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16000)
                setAudioEncodingBitRate(64000)
                setOutputFile(currentAudioFile?.absolutePath)
                prepare()
                start()
            }

            isRecording = true
            Log.i(TAG, "Call audio recording STARTED: ${currentAudioFile?.absolutePath}")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start call recording: ${e.message}", e)
            releaseRecorder()
        }
    }

    @Synchronized
    fun stopRecordingAndSave() {
        if (!isRecording) {
            return
        }

        try {
            mediaRecorder?.stop()
            Log.i(TAG, "Call audio recording STOPPED successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping MediaRecorder: ${e.message}")
        } finally {
            releaseRecorder()
        }

        val audioFile = currentAudioFile
        if (audioFile != null && audioFile.exists() && audioFile.length() > 0) {
            val durationSec = ((System.currentTimeMillis() - recordingStartTime) / 1000).toInt()
            val fileSizeKb = (audioFile.length() / 1024).toInt()

            Log.i(TAG, "SAVED CALL RECORDING: File=${audioFile.name}, Duration=${durationSec}s, Size=${fileSizeKb}KB")

            // Save call recording event to Room DB
            val now = System.currentTimeMillis()
            val eventId = "evt_call_rec_${now}"
            val prefs = AppPreferences(context)
            val activeDeviceId = prefs.getDeviceId()

            val payload = JSONObject().apply {
                put("phoneNumber", activePhoneNumber)
                put("direction", activeDirection)
                put("durationSec", durationSec)
                put("fileSizeBytes", audioFile.length())
                put("filePath", audioFile.absolutePath)
                put("fileName", audioFile.name)
                put("timestamp", now)
            }

            val eventEntity = NormalizedEventEntity(
                eventId = eventId,
                deviceId = activeDeviceId,
                source = "call_recording",
                eventType = "audio_recording",
                timestamp = now,
                collectionMethod = "android_api",
                payloadJson = payload.toString(),
                isSynced = false
            )

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val db = AppDatabase.getInstance(context)
                    db.eventDao().insertEvent(eventEntity)
                    Log.i(TAG, "Call recording event queued in Room DB for server upload.")

                    // Upload actual .m4a audio file bytes to NestJS server /uploads/recordings/
                    val audioMediaType = "audio/mp4".toMediaTypeOrNull()
                    val textMediaType = "text/plain".toMediaTypeOrNull()

                    val fileReq = audioFile.asRequestBody(audioMediaType)
                    val bodyPart = MultipartBody.Part.createFormData("file", audioFile.name, fileReq)
                    val devIdPart = activeDeviceId.toRequestBody(textMediaType)
                    val catPart = "CALL_RECORDING".toRequestBody(textMediaType)
                    val fileNamePart = audioFile.name.toRequestBody(textMediaType)

                    val uploadRes = com.parental.agent.sync.ApiConstants.apiService.uploadMediaFile(bodyPart, devIdPart, catPart, fileNamePart)
                    if (uploadRes.isSuccessful) {
                        Log.i(TAG, "SUCCESSFULLY UPLOADED CALL RECORDING FILE (${audioFile.name}) TO SERVER /uploads/recordings!")
                    } else {
                        Log.w(TAG, "Upload failed HTTP Code: ${uploadRes.code()}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to upload call recording file: ${e.message}")
                }
            }
        }
    }

    private fun releaseRecorder() {
        try {
            mediaRecorder?.reset()
            mediaRecorder?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing MediaRecorder: ${e.message}")
        }
        mediaRecorder = null
        isRecording = false
    }
}
