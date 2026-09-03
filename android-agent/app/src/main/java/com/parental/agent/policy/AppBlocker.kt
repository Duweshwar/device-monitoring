package com.parental.agent.policy

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.widget.Toast
import com.parental.agent.services.AgentDeviceAdminReceiver
import java.util.concurrent.ConcurrentHashMap

class AppBlocker private constructor() {

    companion object {
        private const val TAG = "AppBlocker"

        @Volatile
        private var instance: AppBlocker? = null

        fun getInstance(): AppBlocker {
            return instance ?: synchronized(this) {
                instance ?: AppBlocker().also { instance = it }
            }
        }
    }

    // Thread-safe set of blocked package names
    private val blockedPackages = ConcurrentHashMap.newKeySet<String>().apply {
        add("com.pubg.imobile")
        add("com.zhiliaoapp.musically")
    }

    fun loadFromLocalPrefs(context: Context) {
        val prefs = com.parental.agent.data.local.AppPreferences(context)
        val saved = prefs.getBlockedApps()
        if (saved.isNotEmpty()) {
            blockedPackages.clear()
            blockedPackages.addAll(saved)
            Log.i(TAG, "Loaded ${saved.size} blocked app rules from local storage!")
        }
    }

    fun updateBlockedPackages(packages: List<String>, context: Context? = null) {
        val newSet = packages.toSet()
        if (blockedPackages == newSet) return
        blockedPackages.clear()
        blockedPackages.addAll(packages)
        if (context != null) {
            val prefs = com.parental.agent.data.local.AppPreferences(context)
            prefs.setBlockedApps(newSet)
        }
        Log.i(TAG, "Updated blocked app packages policy: ${blockedPackages.joinToString()}")
    }

    fun addBlockedPackage(packageName: String) {
        blockedPackages.add(packageName)
        Log.i(TAG, "Added blocked package: $packageName")
    }

    fun removeBlockedPackage(packageName: String) {
        blockedPackages.remove(packageName)
        Log.i(TAG, "Removed blocked package: $packageName")
    }

    fun isAppBlocked(packageName: String): Boolean {
        return blockedPackages.contains(packageName)
    }

    /**
     * Inspects target package name. If restricted by parent policy:
     * 1. Uses Device Owner dpm.setPackagesSuspended() if available.
     * 2. Uses Accessibility Service fallback to force-return to Home Screen & display toast.
     */
    fun checkAndEnforceAppBlock(context: Context, packageName: String): Boolean {
        if (!isAppBlocked(packageName)) return false

        Log.w(TAG, "Restricted app launched: $packageName! Enforcing parental block...")

        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, AgentDeviceAdminReceiver::class.java)

        // Path A: Device Owner Package Suspension
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    dpm.setPackagesSuspended(adminComponent, arrayOf(packageName), true)
                    Log.i(TAG, "Package $packageName suspended via Device Owner policy.")
                    return true
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to suspend package $packageName: ${e.message}")
            }
        }

        // Path B: Accessibility & Standard Launcher Home Return Fallback (Non-MDM Mode)
        try {
            if (context is android.accessibilityservice.AccessibilityService) {
                context.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_HOME)
            } else {
                val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                context.startActivity(homeIntent)
            }

            Toast.makeText(
                context.applicationContext,
                "⚠️ This application is restricted by Parent Policy.",
                Toast.LENGTH_LONG
            ).show()
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error performing Home launcher return: ${e.message}", e)
            return false
        }
    }
}
