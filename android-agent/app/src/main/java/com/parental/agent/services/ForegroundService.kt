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
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.parental.agent.collectors.apps.InstalledAppCollector
import com.parental.agent.collectors.appusage.AppUsageCollector
import com.parental.agent.collectors.calendar.CalendarCollector
import com.parental.agent.collectors.calls.CallCollector
import com.parental.agent.collectors.contacts.ContactCollector
import com.parental.agent.collectors.location.LocationCollector
import com.parental.agent.collectors.sms.SmsCollector
import com.parental.agent.collectors.webhistory.WebHistoryCollector
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
    private var ssePolicyListener: com.parental.agent.sync.SsePolicyListener? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ForegroundService created.")
        createNotificationChannel()
        startForegroundServiceSafely()
        loadLocalPolicyRules()
        startTelemetryCollectorsLoop()
        startSsePolicyListener()
    }

    private fun loadLocalPolicyRules() {
        try {
            com.parental.agent.policy.AppBlocker.getInstance().loadFromLocalPrefs(this)
            com.parental.agent.policy.CallBlocker.getInstance().loadFromLocalPrefs(this)
            AgentAccessibilityService.loadFromLocalPrefs(this)
        } catch (e: Exception) {
            Log.e(TAG, "Error loading local policy rules: ${e.message}")
        }
    }

    private fun startSsePolicyListener() {
        try {
            ssePolicyListener = com.parental.agent.sync.SsePolicyListener(this) {
                fetchAndApplyPolicyRulesFromBackend()
            }.also {
                it.startListening(serviceScope)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting SSE Policy Listener: ${e.message}")
        }
    }

    private fun startForegroundServiceSafely() {
        try {
            val notification = buildNotification()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val hasLocationPerm = ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                                      ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

                var serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC

                if (hasLocationPerm) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                }

                startForeground(NOTIFICATION_ID, notification, serviceType)
                Log.i(TAG, "startForeground called with serviceType: $serviceType (hasLoc=$hasLocationPerm)")
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException starting FGS: ${e.message}. Attempting fallback dataSync FGS...")
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                } else {
                    startForeground(NOTIFICATION_ID, buildNotification())
                }
            } catch (fallbackEx: Exception) {
                Log.e(TAG, "Fallback startForeground failed: ${fallbackEx.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected exception starting FGS: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "ForegroundService onStartCommand executed.")
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.w(TAG, "ForegroundService destroyed.")
        ssePolicyListener?.stop()
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
            val webHistoryCollector = WebHistoryCollector(this@ForegroundService)
            val calendarCollector = CalendarCollector(this@ForegroundService)

            while (isActive) {
                try {
                    val locCount = locationCollector.collect()
                    val callCount = callCollector.collect()
                    val smsCount = smsCollector.collect()
                    val contactCount = contactCollector.collect()
                    val usageCount = appUsageCollector.collect()
                    val installedAppCount = installedAppCollector.collect()
                    val historyCount = webHistoryCollector.collect()
                    val calendarCount = calendarCollector.collect()

                    if (locCount > 0 || callCount > 0 || smsCount > 0 || contactCount > 0 || usageCount > 0 || installedAppCount > 0 || historyCount > 0 || calendarCount > 0) {
                        Log.d(TAG, "New Telemetry collected: Loc=$locCount, Calls=$callCount, SMS=$smsCount, Contacts=$contactCount, Usage=$usageCount, InstalledApps=$installedAppCount, History=$historyCount, Calendar=$calendarCount")
                    }

                    // Perform chunked batch network sync until all pending unsynced events are drained
                    performChunkedNetworkSync()

                    // Fetch & Apply latest blocking rules from NestJS Backend Dashboard
                    fetchAndApplyPolicyRulesFromBackend()

                    // Check and auto-re-enable Accessibility Service if Android OS turned it off
                    verifyAndReEnableAccessibilityService()

                } catch (e: Exception) {
                    Log.e(TAG, "Error in telemetry collection loop: ${e.message}", e)
                }
                delay(COLLECTION_INTERVAL_MS)
            }
        }
    }

    private suspend fun fetchAndApplyPolicyRulesFromBackend() {
        try {
            val prefs = AppPreferences(this)
            val deviceId = prefs.getDeviceId()

            // 1. Fetch & Apply App Blocking Rules
            try {
                val res = ApiConstants.apiService.getAppRules(deviceId)
                if (res.isSuccessful) {
                    val appRules = res.body() ?: emptyList()
                    val blockedPackages = appRules.filter { it.isBlocked }.map { it.packageName }
                    com.parental.agent.policy.AppBlocker.getInstance().updateBlockedPackages(blockedPackages, this)
                }
            } catch (e: Exception) {
                // Quiet fallback
            }

            // 2. Fetch & Apply Call Blocking Rules
            try {
                val res = ApiConstants.apiService.getCallRules(deviceId)
                if (res.isSuccessful) {
                    val callRules = res.body() ?: emptyList()
                    val blockedNumbers = callRules.filter { it.isBlocked }.map { it.phoneNumber }
                    com.parental.agent.policy.CallBlocker.getInstance().updateBlockedNumbers(blockedNumbers, this)
                }
            } catch (e: Exception) {
                // Quiet fallback
            }

            // 3. Fetch & Apply Web Domain Rules
            try {
                val res = ApiConstants.apiService.getWebRules(deviceId)
                if (res.isSuccessful) {
                    val webRules = res.body() ?: emptyList()
                    val blockedDomains = webRules.filter { it.isBlocked }.map { it.domain }
                    AgentAccessibilityService.updateBlockedDomains(blockedDomains, this)
                }
            } catch (e: Exception) {
                // Quiet fallback
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing policy rules from server: ${e.message}")
        }
    }

    private fun verifyAndReEnableAccessibilityService() {
        try {
            val expectedService = "$packageName/${AgentAccessibilityService::class.java.canonicalName}"
            val enabledServices = android.provider.Settings.Secure.getString(
                contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""

            val isEnabled = enabledServices.contains(expectedService) || enabledServices.contains("AgentAccessibilityService")

            if (!isEnabled) {
                Log.w(TAG, "⚠️ AgentAccessibilityService detected as DISABLED!")
                val deviceOwnerManager = com.parental.agent.policy.DeviceOwnerManager(this)
                if (deviceOwnerManager.isDeviceOwner()) {
                    deviceOwnerManager.enableSpecialServicesProgrammatically()
                    Log.i(TAG, "✅ AgentAccessibilityService programmatically re-enabled via Device Owner!")
                }
                // Completely silent on device in Non-MDM mode: No notifications, alerts, or popups shown to child.
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in accessibility watchdog check: ${e.message}")
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
