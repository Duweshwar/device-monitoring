# Parental & Enterprise Phone Monitoring — Master Feature Roadmap & Implementation Tracker

> **Last Updated**: 2026-09-03  
> **Repository**: `ParantelPhoneMonitoring`  
> **Status Legend**:
> - 🟢 **Done**: Fully coded in Android Agent, Backend API, and Web Dashboard.
> - ⚡ **Quick Win**: Core structure exists; quick to connect, test, and complete.
> - 🛠️ **Moderate**: Requires additional permissions, background processing, or UI media handling.
> - 🔴 **Not Done / Needs Work**: Planned feature requiring full implementation.
> - 🛑 **On Hold**: Deferred due to Android OS / OEM hardware audio or privacy restrictions.

---

## 📊 Summary Dashboard

| Status Category | Total Count |
| :--- | :-: |
| 🟢 **Completed / Coded** | 9 |
| ⚡ **Quick Wins (Easy & High Priority)** | 13 |
| 🛠️ **Moderate Complexity** | 16 |
| 🔴 **Not Done / In Progress** | 4 |
| 🛑 **On Hold (Hardware / OS Limits)** | 10 |
| **TOTAL ROADMAP FEATURES** | **52** |

---

## 🟢 Phase 1: Core Telemetry, Safety & Basic Controls (16 Features)

| # | Feature | Android Agent Status | Backend API Status | Web Dashboard View | Overall Status | Implementation Effort & Notes |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- |
| 1 | **Call Logs** | `CallLogCollector.kt` | `/telemetry` endpoint | `CallsPage.tsx` | 🟢 **Done** | Fetches incoming/outgoing/missed call logs. |
| 2 | **Contacts Inventory** | `ContactCollector.kt` | `/telemetry` endpoint | `ContactsPage.tsx` | 🟢 **Done** | Reads phone address book and syncs metadata. |
| 3 | **SMS Logs & Content** | `SmsCollector.kt` | `/telemetry` endpoint | `SMSPage.tsx` | 🟢 **Done** | SMS inbox/sent text capture & thread viewer. |
| 4 | **Live GPS Location Tracking** | `LocationCollector.kt` | `/telemetry` endpoint | `LiveLocationPage.tsx` | 🟢 **Done** | GPS coordinates & reverse geocoded history polled & displayed with map focus modal. |
| 5 | **Keylogger Activity** | `AgentAccessibilityService` | `/telemetry` endpoint | `KeyloggerPage.tsx` | 🟢 **Done** | Keystrokes & input field node tree logger. |
| 6 | **Installed Apps Inventory** | `InstalledAppCollector.kt` | `/telemetry` endpoint | `InstalledAppsPage.tsx` | 🟢 **Done** | Installed package list, app names, & icons. |
| 7 | **Calendar Events** | `CalendarCollector.kt` | `/telemetry` endpoint | `CalendarPage.tsx` | 🟢 **Done** | Calendar events, schedules, & reminders parser. |
| 8 | **Block Calls & Installed Apps** | `DeviceOwnerManager.kt` | `/policy` module | `InstalledAppsPage.tsx` | ⚡ **Quick Win** | UI toggles ready; wire push command to launch lock overlay on target device. |
| 9 | **Internet History** | `WebHistoryCollector.kt` | `/telemetry` endpoint | `WebHistoryPage.tsx` | 🟢 **Done** | Intercepts Chrome/browser active URLs and search queries. |
| 10 | **Block/Unblock Websites** | `AgentAccessibilityService` | `/policy` module | `WebHistoryPage.tsx` | ⚡ **Quick Win** | URL intercepted via accessibility; add domain blacklist redirect/close action. |
| 11 | **Remote App Update (OTA)** | Scaffolded | `/updates` module | `MyDevicesPage.tsx` | 🛠️ Moderate | Download & trigger APK update install flow. |
| 12 | **Technical Support Channel** | Pending | `/tickets` endpoint | Support Portal | ⚡ **Quick Win** | In-app support ticket form & chat widget. |
| 13 | **2-Factor / OTP Authentication** | Pending | `/auth/2fa` module | `LoginPage.tsx` | ⚡ **Quick Win** | Dashboard login email/SMS OTP verification. |
| 14 | **30 Days History Retention** | Pending | Daily Cron Purge Job | Admin Metric | ⚡ **Quick Win** | Database cron cleanup job deleting telemetry >30 days. |
| 15 | **Uninstall Protection & Lock** | `AgentDeviceAdminReceiver.kt` | `/check-uninstall` | `MyDevicesPage.tsx` | 🔴 **Not Done** | Admin receiver scaffolded; requires complete Device Owner / DPM lock enforcement testing. |
| 16 | **Secret Dialer Launcher** | `BootReceiver.kt` | N/A | Setup Guide | ⚡ **Quick Win** | Secret code `*#*#2013#*#*` opens diagnostic status screen. |

---

## 🟡 Phase 2: Rich Media, Screenshots & Social Activity (16 Features)

| # | Feature | Android Agent Status | Backend API Status | Web Dashboard View | Overall Status | Implementation Effort & Notes |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- |
| 17 | **Phone Call Recordings** | `CallAudioRecorder.kt` | `/media` storage | `CallRecordingsPage.tsx` | 🛑 **On Hold** | Audio mic input recording is silent on modern Android builds due to OS hardware restrictions. |
| 18 | **Photos & Gallery Sync** | Pending | `/media` storage | Photo Gallery | ⚡ **Quick Win** | MediaStore photo scanner & thumbnail uploader. |
| 19 | **Automated Screenshots** | Pending | `/media` storage | Screenshot Viewer | 🛠️ Moderate | Periodic background screenshot via `MediaProjection` or Accessibility API. |
| 20 | **WhatsApp Chats & Call Logs** | `AgentAccessibilityService` | `/telemetry` endpoint | `WhatsAppPage.tsx` | 🛑 **On Hold** | Deep UI node tree parser for chat DMs and call activity. |
| 21 | **WhatsApp Business** | `AgentAccessibilityService` | `/telemetry` endpoint | `WhatsAppPage.tsx` | 🛑 **On Hold** | Support package `com.whatsapp.w4b`. |
| 22 | **WhatsApp Audio & Videos** | Pending | `/media` storage | `WhatsAppPage.tsx` | ⚡ **Quick Win** | MediaStore folder scanner for WhatsApp Audio/Video. |
| 23 | **WhatsApp Voice Notes** | Pending | `/media` storage | `WhatsAppPage.tsx` | ⚡ **Quick Win** | WhatsApp Voice Notes folder scanner (`.opus` / `.m4a`). |
| 24 | **WhatsApp Images** | Pending | `/media` storage | `WhatsAppPage.tsx` | ⚡ **Quick Win** | WhatsApp Images folder scanner. |
| 25 | **WhatsApp Call Recordings** | Pending | `/media` storage | `CallRecordingsPage.tsx` | 🛑 **On Hold** | Deferred due to VoIP audio capture restrictions. |
| 26 | **Truecaller Call Recordings** | Pending | `/media` storage | `CallRecordingsPage.tsx` | 🛑 **On Hold** | Deferred due to VoIP audio capture restrictions. |
| 27 | **YouTube History Monitoring** | `AgentAccessibilityService` | `/telemetry` endpoint | `WebHistoryPage.tsx` | ⚡ **Quick Win** | Intercepts YouTube app search bars & video titles. |
| 28 | **Instagram Chats & DMs** | `AgentNotificationListener` | `/telemetry` endpoint | Instagram View | 🛠️ Moderate | Notification listener & DM accessibility node reader. |
| 29 | **Snapchat Chats & Activity** | `AgentNotificationListener` | `/telemetry` endpoint | Snapchat View | 🛠️ Moderate | Notification listener & chat screen reader. |
| 30 | **Facebook Messenger Chats** | `AgentNotificationListener` | `/telemetry` endpoint | FB Messenger View | 🛠️ Moderate | Notification listener & chat screen reader. |
| 31 | **Email Monitoring (Gmail/Outlook)**| `AgentNotificationListener` | `/telemetry` endpoint | Email View | ⚡ **Quick Win** | Notification listener for incoming mail headers, subjects, and sender text. |
| 32 | **Unlimited Device Switching** | `AppPreferences` | `/devices` module | `MyDevicesPage.tsx` | ⚡ **Quick Win** | Unlink active device & pair new device seamlessly. |

---

## 🔵 Phase 3: Live Streaming, Ambient Audio & Advanced Apps (20 Features)

| # | Feature | Android Agent Status | Backend API Status | Web Dashboard View | Overall Status | Implementation Effort & Notes |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- |
| 33 | **Instant Stealth Photo Capture** | Pending | `/media` storage | Media Player | 🛠️ Moderate | Background CameraX front/back camera photo capture without preview. |
| 34 | **Surrounding Audio Recordings** | Pending | `/media` storage | Ambient Player | 🛑 **On Hold** | Background mic audio recorder. |
| 35 | **Live Ambient Audio Stream** | Pending | Realtime Stream | Ambient Stream | 🛑 **On Hold** | RTSP / WebRTC live audio stream from device mic. |
| 36 | **Scheduled Surround Recording** | Pending | `/media` storage | Scheduled Jobs | 🛑 **On Hold** | `AlarmManager` repeating RTC background mic recorder. |
| 37 | **FB Messenger Call Recordings** | Pending | `/media` storage | Call Recordings | 🛑 **On Hold** | Hardware VoIP audio restriction. |
| 38 | **Skype Call Recordings** | Pending | `/media` storage | Call Recordings | 🛑 **On Hold** | Hardware VoIP audio restriction. |
| 39 | **WhatsApp Statuses** | Pending | `/media` storage | `WhatsAppPage.tsx` | 🛠️ Moderate | Scan `.Statuses` hidden folder for photos/videos. |
| 40 | **WhatsApp GIFs** | Pending | `/media` storage | `WhatsAppPage.tsx` | ⚡ **Quick Win** | WhatsApp Animated GIFs folder scanner. |
| 41 | **WhatsApp Documents/Stickers** | Pending | `/media` storage | `WhatsAppPage.tsx` | ⚡ **Quick Win** | WhatsApp Documents & Stickers folder scanner. |
| 42 | **Signal Messenger Chats** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 43 | **IMO Chats & Calls** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 44 | **Telegram Chats & Calls** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 45 | **Google Chats** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 46 | **Tinder Chats & Activity** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 47 | **Kik Chats & Calls** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 48 | **LINE Chats & Calls** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 49 | **LinkedIn Messages** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 50 | **Skype Chats & Calls** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 51 | **Viber Chats & Calls** | `AgentNotificationListener` | `/telemetry` endpoint | Chat Viewer | 🛠️ Moderate | Notification & accessibility text extractor. |
| 52 | **Remote Device Lock Command** | `AgentDeviceAdminReceiver` | `/commands` module | `MyDevicesPage.tsx` | ⚡ **Quick Win** | FCM push command triggering `dpm.lockNow()` remotely. |

---

## 🎯 Immediate Priority Execution Queue (Top Quick Wins to Build Next)

1. **⚡ Priority 1: Live GPS Location Tracking Stream**
   * Link `LocationCollector.kt` real-time coordinate payload to `LiveLocationPage.tsx` Leaflet map view.
2. **⚡ Priority 2: App Blocker Enforcement Overlay**
   * Connect `InstalledAppsPage.tsx` block toggles to trigger a full-screen restriction overlay on target device when blocked app is launched.
3. **⚡ Priority 3: Website Domain Blocker**
   * Connect `WebHistoryPage.tsx` domain blacklist toggles to close/redirect blocked web pages in `AgentAccessibilityService.kt`.
4. **⚡ Priority 4: Remote Device Lock & Sync Now Commands**
   * Connect "Lock Device" and "Sync Telemetry Now" buttons in `MyDevicesPage.tsx` to trigger immediate remote device actions.
5. **⚡ Priority 5: Photos & Gallery Media Scanner**
   * Implement local MediaStore photo scanner to upload gallery thumbnails to the web dashboard photo viewer.
