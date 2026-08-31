# AGENT.md — Android Agent Specification

## 1. Overview & Objectives

The **Android Agent** (`/android-agent`) is the device-side component of the Parental & Enterprise Phone Monitoring platform. It runs on target Android devices to collect telemetry (calls, SMS, location, social app activity, app usage, media), enforce policies (app blocking, web filtering, screen time), and securely synchronize data with the backend API.

---

## 2. Technology Stack

- **Language**: Kotlin (1.9+)
- **UI Framework**: Jetpack Compose (Pairing wizard & setup interface)
- **Minimum SDK**: Android 8.0 (API Level 26) / Target SDK: Android 14 (API Level 34)
- **Architecture**: Clean Architecture + MVI/MVVM
- **Local Storage**: Room Persistence Library encrypted with **SQLCipher**; `EncryptedSharedPreferences` for auth tokens & RSA keypairs
- **Background Execution**:
  - Persistent Foreground Service with low-priority ongoing notification
  - `WorkManager` for offline-first telemetry upload jobs & retry queues
  - `AlarmManager` for scheduled surround recordings & heartbeats
- **Networking**: Retrofit 2 + OkHttp 4 with SSL Certificate Pinning
- **Push Messaging**: Firebase Cloud Messaging (FCM) high-priority push triggers
- **Android System Services & Administration**:
  - `DevicePolicyManager` / `DeviceAdminReceiver` (Device Owner / Enterprise EMM Mode: Silent auto-granting of runtime permissions, zero uninstall protection, user restrictions, lock task mode, always-on VPN web filter)
  - `AccessibilityService` (Chat UI parsing, web URL interception, keylogger, programmatic activation via `WRITE_SECURE_SETTINGS`)
  - `NotificationListenerService` (Notification parsing across social apps)
  - `MediaProjection` (On-demand screenshots & instant photo capture)

---

## 3. Directory Structure

```text
android-agent/
├── app/
│   ├── src/main/
│   │   ├── java/com/parental/agent/
│   │   │   ├── core/                  # Security, Auth, Crypto, DeviceID, CapabilityEngine
│   │   │   │   ├── security/          # SQLCipher passphrase, Keystore RSA keys, Token storage
│   │   │   │   ├── capability/        # Hardware & OS Capability Detector Matrix (Device Owner probe)
│   │   │   │   └── logger/            # Encrypted local log recorder
│   │   │   │
│   │   │   ├── data/                  # Local Database, Entities, DAOs, Sync Queue
│   │   │   │   ├── local/             # Room Database, SQLCipher open helper
│   │   │   │   ├── entity/            # NormalizedEventEntity, SyncQueueEntity, MediaQueueEntity
│   │   │   │   └── repository/        # EventRepository, PolicyRepository, CapabilityRepository
│   │   │   │
│   │   │   ├── collectors/            # Isolated Data Collection Modules
│   │   │   │   ├── base/              # BaseCollector interface & event normalizer
│   │   │   │   ├── location/          # FusedLocationProviderClient collector & geofencing
│   │   │   │   ├── calls/             # CallLog collector & phone call recorder
│   │   │   │   ├── sms/               # SmsCollector & SMS Content Parser
│   │   │   │   ├── contacts/          # ContactList sync collector
│   │   │   │   ├── appusage/          # UsageStatsManager & InstalledApps collector
│   │   │   │   ├── keylogger/         # Accessibility Keylogger collector
│   │   │   │   ├── browser/           # Web URL browser history & blocker collector
│   │   │   │   └── media/             # Photos, Screenshots, & Ambient Surround Recorder
│   │   │   │
│   │   │   ├── appintegrations/       # Social & Messaging App Modules
│   │   │   │   ├── whatsapp/          # WhatsApp & WhatsApp Business parser module
│   │   │   │   ├── instagram/         # Instagram DMs & call collector
│   │   │   │   ├── telegram/          # Telegram message & media collector
│   │   │   │   ├── snapchat/          # Snapchat notification & chat collector
│   │   │   │   ├── signal/            # Signal messaging collector
│   │   │   │   └── messaging/         # FB Messenger, Skype, Viber, LINE, IMO collectors
│   │   │   │
│   │   │   ├── services/              # Android System Components & Services
│   │   │   │   ├── ForegroundService.kt     # Main persistent service & watchdog
│   │   │   │   ├── AgentAccessibilityService.kt # Accessibility node tree inspector
│   │   │   │   ├── AgentNotificationListener.kt # Notification interception service
│   │   │   │   ├── AgentDeviceAdminReceiver.kt  # Device Owner / MDM & Uninstall Protection receiver
│   │   │   │   ├── AgentVpnService.kt       # Local Loopback Always-On Web Filter VPN
│   │   │   │   └── AgentFcmService.kt       # FCM Push Command receiver
│   │   │   │
│   │   │   ├── receivers/             # Secret Broadcast & Boot Receivers
│   │   │   │   ├── SecretDialerReceiver.kt  # Re-opens setup screen via *#*#2013#*#*
│   │   │   │   └── BootCompletedReceiver.kt # Autostart on device boot
│   │   │   │
│   │   │   ├── sync/                  # Remote Synchronization Engine
│   │   │   │   ├── SyncWorker.kt            # WorkManager telemetry batch uploader
│   │   │   │   ├── MediaUploadWorker.kt     # Chunked S3 binary media uploader
│   │   │   │   └── CommandExecutor.kt       # Executes remote FCM commands
│   │   │   │
│   │   │   ├── policy/                # Device Policy & Restrictions Engine
│   │   │   │   ├── DeviceOwnerManager.kt    # Silent permission grants, uninstall block, user restrictions
│   │   │   │   ├── AppBlocker.kt            # Blocks restricted apps via UsageStats / DPM
│   │   │   │   └── WebFilter.kt             # Blocks blacklisted URLs via Accessibility / Local VPN
│   │   │   │
│   │   │   └── ui/                    # Setup & Provisioning UI (Jetpack Compose)
│   │   │       ├── theme/             # Material 3 Theme tokens
│   │   │       ├── pairing/           # Pairing Code Input & Registration View
│   │   │       ├── permissions/       # Interactive Permission Granting Wizard (Path B)
│   │   │       ├── wirelessadb/       # Wireless Debugging & Local ADB Pairing Guide
│   │   │       └── status/            # Agent Status & Device Owner Matrix View
│   │   │
│   │   ├── AndroidManifest.xml
│   │   └── res/
│   │
│   └── build.gradle.kts
└── settings.gradle.kts
```

---

## 4. Architectural Principles & Rules

1. **Local Encryption First**: All telemetry (events, calls, SMS, location, keylogs) must be written to the local SQLCipher Room database before network upload. Plaintext database files are forbidden.
2. **Decoupled Collectors**: Collectors must implement the `BaseCollector` interface and emit `NormalizedEvent` objects into the local queue. Collectors must NEVER initiate direct HTTP calls.
3. **Capability & Device Owner Detection Matrix**: The agent must run `CapabilityDetector` on startup to check `dpm.isDeviceOwnerApp(packageName)` and probe device manufacturer limits (Samsung Knox, Xiaomi MIUI battery saver limits), storing state in `CapabilityRepository`.
4. **Server ACK Before Purge**: Synced local records can only be deleted after receiving HTTP 200/201 ACK confirmation from backend server endpoints.
5. **Graceful Failures**: Uncaught accessibility or collector exceptions must be caught locally without crashing the persistent Foreground Service.

---

## 5. Device Owner & ADB Wireless Debugging Auto-Provisioning Engine

### Path A: Device Owner / ADB Auto-Granted Mode (Recommended)
When provisioned as **Device Owner** (`dpm set-device-owner com.parental.agent/.services.AgentDeviceAdminReceiver`) or granted `WRITE_SECURE_SETTINGS` via ADB / Wireless Debugging:
1. **Programmatic Silent Runtime Grants**: Automatically grants `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `READ_CALL_LOG`, `READ_SMS`, `RECEIVE_SMS`, `READ_CONTACTS`, `CAMERA`, and `RECORD_AUDIO` using `dpm.setPermissionGrantState()` without showing popups.
2. **Zero Uninstall Protection**: Calls `dpm.setUninstallBlocked(adminComponent, packageName, true)` to block uninstallation from Android Settings.
3. **System User Restrictions**: Enforces `DISALLOW_FACTORY_RESET`, `DISALLOW_SAFE_BOOT`, and `DISALLOW_MODIFY_ACCOUNTS`.
4. **Programmatic Special Services Injection**: Writes directly to `Settings.Secure` to activate `AgentAccessibilityService` and `AgentNotificationListener` programmatically.
5. **Always-On Local Web Filter VPN**: Enables `AgentVpnService` via `dpm.setAlwaysOnVpnPackage()` for hardware-level DNS & web filtering.
6. **Post-Setup Developer Options Cleanup**: Installer turns OFF Wireless Debugging & Developer Options in Settings to remove status bar indicators and prevent tampering (all granted permissions remain permanently intact).

### Path B: Standard Guided Interactive Flow (Fallback)
If Device Owner status is not provisioned, the Jetpack Compose onboarding wizard guides the installer through manual permission toggling and local Wireless Debugging pairing code entry.

---

## 6. OEM Persistence & Battery Saver Bypass Strategy

To prevent OEM battery optimization algorithms (Samsung OneUI, Xiaomi MIUI/HyperOS, Oppo ColorOS, Vivo FuntouchOS) from killing the agent's persistent background service:

1. **Doze Mode Exemption**: The setup wizard prompts the parent/user to grant `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
2. **OEM Autostart Intent Launcher**: Automatically opens manufacturer-specific settings screens during initial setup:
   - Xiaomi: `com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity`
   - Samsung: `com.samsung.android.looper/com.samsung.android.sm.ui.battery.BatteryActivity`
   - Oppo/Realme: `com.coloros.safecenter/com.coloros.safecenter.permission.startup.StartupAppListActivity`
   - Vivo: `com.iqoo.secure/com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity`
3. **Watchdog Heartbeat**: An `AlarmManager` repeating RTC_WAKEUP alarm fires every 15 minutes to verify `ForegroundService` status and re-launch it if destroyed.
4. **Phantom Process Cost Limit**: ADB script sets `set-phantom-process-cost-limit 2147483647` on Android 12+ to prevent OS background process trimming.

---

## 7. Audio Capture Hardware Strategy

Due to Android 10+ privacy restrictions on raw call recording, the `AudioCollector` operates dynamically based on hardware capability:

- **Mode A: Two-Way Hardware Recording (`two_way_hardware`)**: Probes Android kernel/hardware support for direct call stream capture (`AudioSource.VOICE_CALL`). Supported on older builds or specific OEM builds.
- **Mode B: Microphone Fallback (`mic_fallback`)**: Uses `AudioSource.VOICE_RECOGNITION` or `MIC` during active calls to capture speakerphone and local user voice.
- **Mode C: Ambient Surround Recording (`surround_only`)**: On-demand or scheduled background microphone recording when no active calls are present.
- **Reporting**: The detected mode is stored in `CapabilityMatrix` and sent to backend so the Client Dashboard displays hardware limitation badges accurately.

---

## 8. Android Agent Onboarding Flow & Secret Dialer Launcher

The setup wizard evaluates device status upon launch:

```text
  [ App Boot ] ───► Is Device Owner / ADB Provisioned?
                           │
             ┌─────────────┴─────────────┐
             ▼ (YES - Path A)            ▼ (NO - Path B)
  [ Silent Permission Auto-Grant ]  [ Interactive 4-Step Setup Wizard ]
  [ Auto-Enable Accessibility/Notif ]│  - Terms & Conditions
  [ Activate Always-On VPN ]         │  - Manual Permission Checklist
             │                       │  - Wireless ADB Pairing Screen
             └─────────────┬─────────┘
                           ▼
             [ Device Pairing & Activation ]
                           │ (Input 6-digit pairing code from Dashboard)
                           ▼
             [ Active Protection / Stealth Mode ]
```

### Secret Dialer Activation Code:
If the agent app icon is hidden from the home screen, entering **`*#*#2013#*#*`** into the native phone dialer triggers `SecretDialerReceiver`, opening the Agent Configuration & Diagnostic status screen.

