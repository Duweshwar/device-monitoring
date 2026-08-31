package com.parental.agent.services

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.sync.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class AgentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "AgentAccessibility"
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return

        // Intercept Android Settings window when deactivating device admin
        if (packageName == "com.android.settings") {
            val rootNode = rootInActiveWindow ?: return
            checkAndShieldDeactivationScreen(rootNode)
        }
    }

    private fun checkAndShieldDeactivationScreen(rootNode: AccessibilityNodeInfo) {
        // Detect text elements related to Device Admin Deactivation
        val isDeactivationScreen = containsText(rootNode, "Device admin") ||
                containsText(rootNode, "Device administrator") ||
                containsText(rootNode, "Deactivate") ||
                containsText(rootNode, "UNINSTALLATION BLOCKED")

        if (isDeactivationScreen) {
            val prefs = AppPreferences(applicationContext)
            val deviceId = prefs.getDeviceToken() ?: "dev_local_agent"

            var isUninstallationAllowed = false
            try {
                runBlocking(Dispatchers.IO) {
                    val retrofit = Retrofit.Builder()
                        .baseUrl("https://ai-companion.quizpati.com/")
                        .addConverterFactory(GsonConverterFactory.create())
                        .build()

                    val apiService = retrofit.create(ApiService::class.java)
                    val response = apiService.checkUninstallPermission(deviceId)

                    if (response.isSuccessful && response.body()?.allowUninstallation == true) {
                        isUninstallationAllowed = true
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Live server check failed: ${e.message}")
                isUninstallationAllowed = false
            }

            if (!isUninstallationAllowed) {
                Log.w(TAG, "Blocking deactivation screen attempt! Closing Settings window...")
                // Immediately kick back to Home Screen before user can tap OK
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

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted.")
    }
}
