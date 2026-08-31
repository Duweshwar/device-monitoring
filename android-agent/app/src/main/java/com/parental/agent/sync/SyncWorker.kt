package com.parental.agent.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

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

        return try {
            val retrofit = Retrofit.Builder()
                .baseUrl("https://ai-companion.quizpati.com/") // Local dev backend emulator URL
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            val apiService = retrofit.create(ApiService::class.java)

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
                    "deviceId" to entity.deviceId,
                    "source" to entity.source,
                    "eventType" to entity.eventType,
                    "timestamp" to entity.timestamp,
                    "collectionMethod" to entity.collectionMethod,
                    "payload" to payloadMap
                )
            }

            val payload = SyncPayload(
                deviceId = unsyncedEvents.first().deviceId,
                events = eventPayloads
            )

            val response = apiService.syncEvents(payload)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                val isAllowed = body?.allowUninstallation == true
                prefs.setUninstallationAllowed(isAllowed)

                val syncedIds = unsyncedEvents.map { it.eventId }
                database.eventDao().markEventsSynced(syncedIds)
                database.eventDao().purgeSyncedEvents()
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
