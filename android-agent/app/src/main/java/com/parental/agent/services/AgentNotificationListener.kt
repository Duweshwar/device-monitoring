package com.parental.agent.services

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
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

class AgentNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "AgentNotification"
        private val WHATSAPP_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")
        private val IGNORED_SYSTEM_TEXTS = setOf(
            "checking for new messages",
            "whatsapp web is currently active",
            "whatsapp web is active",
            "backup in progress",
            "finishing backup",
            "restoring media",
            "whatsapp web",
            "new messages",
            "unread messages"
        )
    }

    @Volatile
    private var lastCapturedTitle: String = ""
    @Volatile
    private var lastCapturedText: String = ""
    @Volatile
    private var lastCapturedTime: Long = 0L

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        try {
            if (sbn == null) return
            val packageName = sbn.packageName ?: return

            // Capture WhatsApp and WhatsApp Business Notifications
            if (WHATSAPP_PACKAGES.contains(packageName)) {
                processWhatsAppNotification(sbn, packageName)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification: ${e.message}")
        }
    }

    private fun processWhatsAppNotification(sbn: StatusBarNotification, packageName: String) {
        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        var title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        var text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""

        if (text.isBlank() && bigText.isNotBlank()) {
            text = bigText
        }

        // Try extracting from MessagingStyle if available
        if (extras.containsKey(Notification.EXTRA_MESSAGES)) {
            val messageBundles = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
            if (messageBundles != null && messageBundles.isNotEmpty()) {
                val lastBundle = messageBundles.last()
                if (lastBundle is Bundle) {
                    val msgText = lastBundle.getCharSequence("text")?.toString()?.trim()
                    val msgSender = lastBundle.getCharSequence("sender")?.toString()?.trim()
                    if (!msgText.isNullOrBlank()) {
                        text = msgText
                    }
                    if (!msgSender.isNullOrBlank()) {
                        title = msgSender
                    }
                }
            }
        }

        if (title.isBlank() || text.isBlank()) return

        // 1. Filter out system noise and status count notifications ("2 new messages", "3 new messages")
        val lowerText = text.lowercase()
        if (IGNORED_SYSTEM_TEXTS.any { lowerText.contains(it) } ||
            lowerText.matches(Regex(".*\\d+\\s+(new|unread)\\s+messages.*")) ||
            lowerText.matches(Regex(".*\\d+\\s+messages.*"))
        ) {
            Log.d(TAG, "Filtered system status WhatsApp notification: \"$text\"")
            return
        }

        // 2. Prevent duplicate notification callbacks within a 5-second window
        val postTime = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis()
        val now = System.currentTimeMillis()

        if (title == lastCapturedTitle && text == lastCapturedText && (now - lastCapturedTime) < 5000L) {
            Log.d(TAG, "Skipped duplicate WhatsApp notification callback: \"$title: $text\"")
            return
        }

        lastCapturedTitle = title
        lastCapturedText = text
        lastCapturedTime = now

        val appName = if (packageName == "com.whatsapp.w4b") "WhatsApp Business" else "WhatsApp"
        val cleanTitle = title.replace(Regex("[^a-zA-Z0-9]"), "_").lowercase()
        val cleanText = text.replace(Regex("[^a-zA-Z0-9]"), "_").lowercase()
        val secBucket = postTime / 1000L
        val eventId = "evt_wa_${cleanTitle}_${cleanText}_${secBucket}"

        Log.i(TAG, "📱 WHATSAPP MESSAGE CAPTURED VIA NOTIFICATION: App=$appName, Sender=\"$title\", Text=\"$text\"")

        val payload = JSONObject().apply {
            put("sender", if (title.isNotBlank()) title else "WhatsApp Contact")
            put("message", text)
            put("packageName", packageName)
            put("appName", appName)
            put("isOutgoing", false)
            put("timestamp", postTime)
            put("chatTitle", title)
        }

        val eventEntity = NormalizedEventEntity(
            eventId = eventId,
            deviceId = prefsDeviceId(),
            source = "whatsapp",
            eventType = "chat_message",
            timestamp = postTime,
            collectionMethod = "notification",
            payloadJson = payload.toString(),
            isSynced = false
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val database = AppDatabase.getInstance(applicationContext)
                database.eventDao().insertEvent(eventEntity)
                performInstantUpload(database, prefsDeviceId())
            } catch (e: Exception) {
                Log.e(TAG, "Error saving WhatsApp notification event: ${e.message}")
            }
        }
    }

    private fun prefsDeviceId(): String {
        return try {
            AppPreferences(applicationContext).getDeviceId()
        } catch (e: Exception) {
            "dev_local_agent"
        }
    }

    private fun performInstantUpload(database: AppDatabase, deviceId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val unsyncedEvents = database.eventDao().getUnsyncedEvents(limit = 20)
                if (unsyncedEvents.isEmpty()) return@launch

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
                        "deviceId" to deviceId,
                        "source" to entity.source,
                        "eventType" to entity.eventType,
                        "timestamp" to entity.timestamp,
                        "collectionMethod" to entity.collectionMethod,
                        "payload" to payloadMap
                    )
                }

                val payload = SyncPayload(deviceId = deviceId, events = eventPayloads)
                val response = ApiConstants.apiService.syncEvents(payload)

                if (response.isSuccessful && response.body()?.success == true) {
                    val confirmedIds = response.body()?.syncedEventIds.orEmpty()
                    if (confirmedIds.isNotEmpty()) {
                        database.eventDao().markEventsSynced(confirmedIds)
                    }
                }
            } catch (e: Exception) {
                // Quiet fail
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Notification dismissed handler
    }
}
