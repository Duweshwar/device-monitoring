package com.parental.agent.policy

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.UserManager
import android.provider.Settings
import android.util.Log
import com.parental.agent.services.AgentDeviceAdminReceiver

class DeviceOwnerManager(private val context: Context) {

    companion object {
        private const val TAG = "DeviceOwnerManager"
    }

    private val dpm: DevicePolicyManager =
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent: ComponentName =
        ComponentName(context, AgentDeviceAdminReceiver::class.java)

    /**
     * Checks if the app currently holds Device Owner (Enterprise MDM) status.
     */
    fun isDeviceOwner(): Boolean {
        return try {
            dpm.isDeviceOwnerApp(context.packageName)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Device Owner status: ${e.message}", e)
            false
        }
    }

    /**
     * Checks if the app holds active Device Admin (Legacy) status.
     */
    fun isDeviceAdminActive(): Boolean {
        return try {
            dpm.isAdminActive(adminComponent)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Device Admin status: ${e.message}", e)
            false
        }
    }

    /**
     * Executes Path A Provisioning: Auto-grants runtime permissions, locks uninstallation,
     * enforces system user restrictions, and sets always-on VPN if Device Owner status is held.
     */
    fun executeDeviceOwnerProvisioning(): Boolean {
        if (!isDeviceOwner()) {
            Log.w(TAG, "App is not Device Owner. Skipping silent auto-provisioning.")
            return false
        }

        Log.i(TAG, "Device Owner detected! Executing automated security & permission provisioning...")

        try {
            // 1. Silent Runtime Permission Grants
            val permissionsToGrant = mutableListOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.READ_CALENDAR
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                permissionsToGrant.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissionsToGrant.add(Manifest.permission.POST_NOTIFICATIONS)
                permissionsToGrant.add(Manifest.permission.READ_MEDIA_IMAGES)
                permissionsToGrant.add(Manifest.permission.READ_MEDIA_AUDIO)
                permissionsToGrant.add(Manifest.permission.READ_MEDIA_VIDEO)
            }

            for (permission in permissionsToGrant) {
                try {
                    val success = dpm.setPermissionGrantState(
                        adminComponent,
                        context.packageName,
                        permission,
                        DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                    )
                    Log.d(TAG, "Granting $permission: $success")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to grant $permission: ${e.message}")
                }
            }

            // 2. Block App Uninstallation
            dpm.setUninstallBlocked(adminComponent, context.packageName, true)
            Log.i(TAG, "Uninstall protection enforced via Device Owner.")

            // 3. Enforce System User Restrictions (Anti-Tampering)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_MODIFY_ACCOUNTS)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_UNINSTALL_APPS)
            Log.i(TAG, "System anti-tampering restrictions applied.")

            // 4. Try Programmatic Activation of Special Services (Requires WRITE_SECURE_SETTINGS)
            enableSpecialServicesProgrammatically()

            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error executing Device Owner provisioning: ${e.message}", e)
            return false
        }
    }

    /**
     * Programmatically activates Accessibility & Notification Listener services if WRITE_SECURE_SETTINGS is granted.
     */
    fun enableSpecialServicesProgrammatically() {
        try {
            val packageName = context.packageName

            // Enable Accessibility Service
            val accessibilityService = "$packageName/$packageName.services.AgentAccessibilityService"
            val currentAccessibility = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""

            if (!currentAccessibility.contains(accessibilityService)) {
                val newAccessibility = if (currentAccessibility.isEmpty()) {
                    accessibilityService
                } else {
                    "$currentAccessibility:$accessibilityService"
                }
                Settings.Secure.putString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
                    newAccessibility
                )
                Settings.Secure.putInt(
                    context.contentResolver,
                    Settings.Secure.ACCESSIBILITY_ENABLED,
                    1
                )
                Log.i(TAG, "AgentAccessibilityService programmatically enabled via Secure Settings.")
            }

            // Enable Notification Listener Service
            val notificationListener = "$packageName/$packageName.services.AgentNotificationListener"
            val currentListeners = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: ""

            if (!currentListeners.contains(notificationListener)) {
                val newListeners = if (currentListeners.isEmpty()) {
                    notificationListener
                } else {
                    "$currentListeners:$notificationListener"
                }
                Settings.Secure.putString(
                    context.contentResolver,
                    "enabled_notification_listeners",
                    newListeners
                )
                Log.i(TAG, "AgentNotificationListener programmatically enabled via Secure Settings.")
            }

        } catch (e: SecurityException) {
            Log.w(TAG, "WRITE_SECURE_SETTINGS permission missing. Manual user toggle required for special services.")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling special services programmatically: ${e.message}", e)
        }
    }

    /**
     * Configures Always-On Local Web Filter VPN if Device Owner status is present.
     */
    fun setAlwaysOnVpn(vpnPackageName: String = context.packageName): Boolean {
        if (!isDeviceOwner()) return false
        return try {
            dpm.setAlwaysOnVpnPackage(adminComponent, vpnPackageName, true)
            Log.i(TAG, "Always-On VPN enforced for $vpnPackageName")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set Always-On VPN: ${e.message}", e)
            false
        }
    }
}
