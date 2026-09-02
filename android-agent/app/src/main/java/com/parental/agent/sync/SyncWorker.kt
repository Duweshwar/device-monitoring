package com.parental.agent.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import org.json.JSONObject

class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getInstance(applicationContext)
        val prefs = AppPreferences(applicationContext)
        val unsyncedEvents = database.eventDao().getUnsyncedEvents(limit = 50)

        if (unsyncedEvents.isEmpty()) {
            return Result.success()
        }

        val activeDeviceId = prefs.getDeviceId()

        return try {
            val apiService = ApiConstants.apiService

            val eventPayloads = unsyncedEvents.map { entity ->
                val payloadMap = try {
                    val json = JSONObject(entity.payloadJson)
                    val map = mutableMapOf<String, Any?>()
                    json.keys().forEach { key -> map[key] = json.get(key) }
                    map
                } catch (e: Exception) {
                    emptyMap<String, Any?>()
                }

                val eventDevId = if (entity.deviceId.isBlank() || entity.deviceId == "dev_local_agent") activeDeviceId else entity.deviceId

                mapOf(
                    "eventId" to entity.eventId,
                    "deviceId" to eventDevId,
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

            val response = apiService.syncEvents(payload)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                val isAllowed = body?.allowUninstallation == true
                prefs.setUninstallationAllowed(isAllowed)

                // STRICT ACKS: Only mark events as synced if server explicitly returned their event ID in syncedEventIds
                val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                val localEventIds = unsyncedEvents.map { it.eventId }
                val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                if (confirmedSyncedIds.isNotEmpty()) {
                    database.eventDao().markEventsSynced(confirmedSyncedIds)
                }

                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
