# AGENT.md — System Architecture & Product Blueprint

## 1. Product Overview

Build an authorized, enterprise-grade Android device-monitoring and management SaaS platform supporting two primary operational modes:

1. **Parent Mode** — Parents manage and monitor their child's Android device for safety, location tracking, content filtering, screen-time controls, and activity visibility.
2. **Business Mode** — Companies manage, monitor, and enforce security policies on company-owned employee Android devices (MDM / Enterprise Mobility Management).

The platform consists of four core applications contained within a unified repository:
- **Android Agent** (`/android-agent`)
- **Backend API Server** (`/backend`)
- **Client Dashboard** (`/client-dashboard`) — Web Portal for Parents & Company Clients
- **Admin Dashboard** (`/admin-dashboard`) — Internal Control Center for Operations, Support & Admins

---

## 2. Project Directory Structure

```text
ParantelPhoneMonitoring/
├── android-agent/                     # Kotlin Android Application
│   ├── docs/
│   │   └── AGENT.md                   # Android Agent Specification
│   ├── app/
│   │   ├── src/main/java/com/parental/agent/
│   │   │   ├── core/                  # Security, Auth, Device ID, Crypto, Capability Engine
│   │   │   ├── data/                  # SQLCipher Room DB, Data Store, Sync Queue
│   │   │   ├── collectors/            # Location, SMS, Calls, AppUsage, Keylogger, Contacts
│   │   │   ├── appintegrations/       # WhatsApp, Instagram, Telegram, Signal, Snapchat, etc.
│   │   │   ├── services/              # Foreground Service, NotificationListener, AccessibilityService, DeviceAdminReceiver
│   │   │   ├── sync/                  # Remote Sync Engine, Media Upload, Retry Manager
│   │   │   ├── policy/                # App Blocker, Web Filter, Remote Commands
│   │   │   └── ui/                    # Pairing UI, Capability Setup (Jetpack Compose)
│   │   └── build.gradle.kts
│   └── settings.gradle.kts
│
├── backend/                           # Backend API & Real-time Services (NestJS)
│   ├── docs/
│   │   └── AGENT.md                   # Backend API Specification
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                  # JWT, 2FA/OTP, Auth Guards, Refresh Tokens
│   │   │   ├── users/                 # Parent & Organization Accounts
│   │   │   ├── devices/               # Device Enrollment, Capability Matrix, Licensing
│   │   │   ├── collectors/            # Event Receiver, Batch Ingestion, Parsing
│   │   │   ├── policies/              # App/Website Blocking, Geofence Rules
│   │   │   ├── media/                 # S3 Pre-signed URLs, Storage Manager
│   │   │   ├── realtime/              # SSE (Server-Sent Events) Gateway, WebSockets, FCM
│   │   │   ├── reports/               # Analytics, Timeline Aggregator, Usage Stats
│   │   │   └── admin/                 # System Metrics, Feature Flags, Subscriptions
│   │   ├── common/                    # Shared DTOs, Interceptors, Filters, Crypto
│   │   └── database/                  # PostgreSQL Schemas, Migrations, Seeds
│   ├── package.json
│   └── tsconfig.json
│
├── web-dashboard/                     # Web Applications Parent Directory
│   ├── docs/
│   │   └── AGENT.md                   # Web Dashboard Suite Architecture Overview
│   │
│   ├── client-dashboard/              # Customer Portal (Parents & Business Clients)
│   │   ├── docs/
│   │   │   └── AGENT.md               # Client Dashboard Specification
│   │   ├── src/
│   │   │   ├── components/            # Shadcn UI, Maps, Media Viewer, Chat Bubbles
│   │   │   ├── views/
│   │   │   │   ├── parent/            # Child Device View, Screen Time, Web Safety, Live Map
│   │   │   │   └── business/          # Fleet View, MDM Policies, Employee Compliance
│   │   │   ├── services/              # SSE Client, Axios API Client
│   │   │   ├── store/                 # Zustand (Auth state, active device, UI state)
│   │   │   └── hooks/                 # Data Hooks (useLiveLocation, useSseStream, useTelemetry)
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── admin-dashboard/               # Internal Team Dashboard (Admins, Support & Billing)
│       ├── docs/
│       │   └── AGENT.md               # Admin Dashboard Specification
│       ├── src/
│       │   ├── components/            # System Metric Cards, License Table, Audit Logs
│       │   ├── views/
│       │   │   ├── tenants/           # Customer Account & Organization Management
│       │   │   ├── billing/           # Subscriptions, Invoices, License Generator
│       │   │   ├── metrics/           # DB Event Ingestion Rates, SSE Streams, S3 Sizing
│       │   │   ├── support/           # Remote Capability Inspector, Diagnostics
│       │   │   └── audit/             # System Audit Logs & Global Feature Flags
│       │   ├── services/              # Admin API Service, Admin SSE Telemetry Stream
│       │   ├── store/                 # Admin Auth & System Metrics Store
│       │   └── hooks/                 # Admin Hooks (useTenants, useSystemHealth)
│       ├── package.json
│       └── vite.config.ts
│
├── docs/                              # Product Specs & Architecture Docs
│   ├── AGENT.md                       # Master Architecture & Product Blueprint (Root)
│   └── plan-phase.md                  # Product Release Roadmap
```

---

## 3. Technology Stack & Architectural Decision Record (ADR)

### A. Android Agent
- **Language & Framework**: Kotlin, Jetpack Compose UI (Pairing & Setup flow).
- **Architecture**: Clean Architecture + MVI/MVVM.
- **Local Storage**: Room Persistence Library encrypted with **SQLCipher** for database level encryption; `EncryptedSharedPreferences` for keys.
- **Background Execution**: Persistent Foreground Service with low-footprint notification, `WorkManager` for persistent upload jobs, `AlarmManager` for scheduled tasks.
- **Network**: Retrofit 2 + OkHttp 4 (with SSL Pinning & Certificate Verification).
- **System Services Integration**: Android `AccessibilityService`, `NotificationListenerService`, `DeviceAdminReceiver` / `DevicePolicyManager` (Device Owner / Enterprise MDM mode: silent permission grants, zero uninstall protection, user restrictions), `VpnService` (Always-On local web filter), `MediaProjection` (Screenshots & Live Stream).
- **Push Messaging**: Firebase Cloud Messaging (FCM) for low-latency wake up and immediate remote command execution.

### B. Backend API Framework Comparison: NestJS vs ASP.NET Core (.NET 8/9)

#### Option 1: NestJS (Node.js / TypeScript) — **[RECOMMENDED & SELECTED]**
- **Pros**:
  - **Shared Language & Schemas**: Frontend (Vite + React) and Backend (NestJS) use 100% TypeScript, allowing shared DTOs, API interfaces, and contract safety.
  - **Native SSE (Server-Sent Events)**: NestJS provides first-class native SSE support via RxJS (`@Sse()`) out-of-the-box for streaming real-time alerts, location updates, and sync status to the Web Dashboard without complex setup.
  - **Rich Ecosystem**: Easy integration with Prisma/TypeORM, BullMQ (Redis job queue), S3 SDK, and FCM.
  - **Micro/Modular Monolith Structure**: High developer velocity and modular code isolation.

#### Option 2: ASP.NET Core (.NET 8/9)
- **Pros**:
  - **Raw Performance & Concurrency**: Exceptional throughput and ultra-low CPU/memory usage under heavy device telemetry loads.
  - **SignalR Real-Time Engine**: Built-in SignalR automatically negotiates WebSockets, SSE, or Long Polling for real-time dashboard updates.
  - **Enterprise MDM Standard**: Widely adopted in enterprise device management backend systems.

> **Decision Summary**: **NestJS (TypeScript)** is selected for the Backend due to seamless type sharing with the Vite+React Web Dashboard, native `@Sse()` support for lightweight Server-Sent Events, rapid development speed, and clean modular monolith architecture. PostgreSQL will be used for metadata, Redis (BullMQ) for queue processing & caching, and S3-compatible storage (Cloudflare R2 / AWS S3 / MinIO) for media files.

### C. Web Dashboard
- **Framework**: Vite + React (TypeScript) SPA.
- **Styling**: Tailwind CSS + Shadcn UI + Lucide Icons.
- **Real-Time Integration**: Native SSE (Server-Sent Events) Client for live device feeds, alerts, and sync notifications; Axios for REST endpoints.
- **Mapping & Visualization**: Leaflet.js / Mapbox GL for interactive live GPS tracking & historical route playback; Recharts / Tremor for app usage analytics.
- **State Management**: Zustand / TanStack Query (React Query) for server state caching.

---

## 4. Phase-Wise Product & Feature Roadmap (Aligned with `plan-phase.md`)

The engineering roadmap explicitly matches the 3 feature release phases specified in `plan-phase.md`:

```text
+-----------------------------------------------------------------------------------+
|                            PHASE-WISE FEATURE MATRIX                              |
+------------------------------------+----------------------------------------------+
| Phase 1: Core Telemetry & Controls | - Call Logs                                  |
|                                    | - Contacts List                              |
|                                    | - SMS Logs & Content                         |
|                                    | - Live GPS Location Tracking                 |
|                                    | - Keylogger Activity                         |
|                                    | - Installed Apps Inventory                   |
|                                    | - Calendar Events                            |
|                                    | - Block Calls & Installed Apps               |
|                                    | - Internet Browsing History                  |
|                                    | - Web Filtering (Block/Unblock Web Sites)    |
|                                    | - Remote App Update Engine                   |
|                                    | - Technical Support Channel                  |
|                                    | - 2-Factor / OTP Authentication              |
|                                    | - 30 Days Data History Retention             |
|                                    | - Uninstall Protection Service               |
+------------------------------------+----------------------------------------------+
| Phase 2: Rich Media & App Activity | - Phone Call Recordings                      |
|                                    | - On-Demand Photos & Screen Capture          |
|                                    | - WhatsApp Call Recordings                   |
|                                    | - Truecaller Call Recordings                 |
|                                    | - WhatsApp Chats & Call Logs                 |
|                                    | - WhatsApp Business Integration              |
|                                    | - WhatsApp Audio & Video Files               |
|                                    | - WhatsApp Voice Notes                       |
|                                    | - WhatsApp Images Capture                    |
|                                    | - YouTube History Monitoring                 |
|                                    | - Instagram Chats & Call Activity            |
|                                    | - Snapchat Chats & Activity                  |
|                                    | - Facebook Messenger Chats & Calls           |
|                                    | - Email Logs (Google, Yahoo, Outlook Mails)  |
|                                    | - Automated Periodic Screenshots             |
|                                    | - Unlimited Device Switching                 |
+------------------------------------+----------------------------------------------+
| Phase 3: Live Streaming & Ambient  | - Instant Stealth Photo Capture              |
|                                    | - Surrounding Audio Recordings               |
|                                    | - Live Ambient Audio Streaming               |
|                                    | - Scheduled Ambient Surround Recordings      |
|                                    | - FB Messenger Call Recordings               |
|                                    | - Skype Call Recordings                      |
|                                    | - WhatsApp Statuses (Photos/Videos)          |
|                                    | - WhatsApp GIFs & Documents/Stickers         |
|                                    | - Signal Messenger Chats                     |
|                                    | - IMO Chats & Calls                          |
|                                    | - Telegram Chats & Calls                     |
|                                    | - Google Chats                               |
|                                    | - Tinder Chats & Activity                    |
|                                    | - Kik Chats & Calls                          |
|                                    | - LINE Chats & Calls                         |
|                                    | - LinkedIn Messages                          |
|                                    | - Skype Chats & Calls                        |
|                                    | - Viber Chats & Calls                        |
+------------------------------------+----------------------------------------------+
```

---

## 5. Android Agent Architecture & Design Principles

```text
                              Android Agent Architecture
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|               (Jetpack Compose - Device Pairing & Capability Status)               |
+-----------------------------------------------------------------------------------+
|                                   SERVICE LAYER                                   |
|   Persistent Foreground Service | Notification Listener | Accessibility Service  |
|                   Device Admin / Device Owner Receiver                            |
+-----------------------------------------------------------------------------------+
|                                 COLLECTOR LAYER                                   |
|   Location | SMS | Calls | AppUsage | Keylogger | Media | Third-Party App Parsers |
+-----------------------------------------------------------------------------------+
|                             CAPABILITY DETECTION MATRIX                           |
|       Detects granted permissions, OS version, Knox/OEM limits, and services       |
+-----------------------------------------------------------------------------------+
|                             LOCAL DATA ENCRYPTION ENGINE                          |
|                  Room Database with SQLCipher | Encrypted Storage                 |
+-----------------------------------------------------------------------------------+
|                                SYNC & QUEUE ENGINE                                |
|           WorkManager | Exponential Backoff | Chunked Media Uploader              |
+-----------------------------------------------------------------------------------+
                                         |  HTTPS / TLS 1.3
                                         v
                                   BACKEND API
```

### Key Collector Rules
1. **Decoupled Architecture**: Collectors must never directly call backend APIs. Every collector produces standardized `NormalizedEvent` records inserted into the Room Sync Queue.
2. **Graceful Degradation**: If a capability (e.g., VoIP call recording or accessibility reading) is unsupported or revoked on a given Android build, the agent flags the capability as `disabled` and continues operating without crashing or blocking other collectors.
3. **Persisted Local Queue**: All collected telemetry must be committed to SQLCipher local database before upload transmission. Records are deleted only upon receiving valid HTTP 200/201 ACK from backend.

---

## 6. Event Normalization Model

All telemetry collected across Android APIs, notification listeners, accessibility events, and file inspectors is normalized into a unified event JSON format:

```json
{
  "eventId": "evt_8f7b2c1a-9482-41a3-b912-110293849102",
  "deviceId": "dev_98124719-ab82",
  "organizationId": "org_3310-9012",
  "mode": "PARENT", 
  "source": "whatsapp",
  "eventType": "chat_message",
  "timestamp": "2026-08-27T02:14:26.102Z",
  "collectionMethod": "accessibility",
  "payload": {
    "sender": "+1234567890",
    "recipient": "Child",
    "messageText": "Meeting at 5 PM",
    "hasMedia": false,
    "mediaId": null
  },
  "deviceMetadata": {
    "batteryLevel": 85,
    "isCharging": false,
    "networkType": "WIFI",
    "appVersion": "1.0.0"
  }
}
```

### Collection Methods:
- `android_api`: Standard Android SDK calls (LocationManager, CallLog, Telephony, UsageStatsManager).
- `notification`: NotificationListenerService interception.
- `accessibility`: AccessibilityService UI node tree parsing.
- `media`: MediaStore & FileSystem scanning.
- `device_policy`: DevicePolicyManager / Enterprise APIs.
- `user_action`: Direct interactive commands or setup actions.

---

## 7. App Integration Modules (WhatsApp, Instagram, Telegram, etc.)

Each social/messaging application integration operates as a self-contained module isolated from the agent core:

```text
[ Application Integration Module ]
       │
       ├── NotificationCollector   ➜ Parses notification title, text, sender, app target
       ├── AccessibilityCollector  ➜ Captures visible chat UI text, recipient names, call screens
       ├── MediaCollector         ➜ Monitors app media folders (Voice notes, images, videos, stickers)
       ├── CallActivityCollector   ➜ Captures VoIP call start, end, duration, caller ID
       └── CapabilityDetector      ➜ Evaluates device support for media extraction & call recording
```

### Third-Party App Matrix:
- **WhatsApp / WhatsApp Business**: Full chat extraction, call logs, call recording (where hardware permitted), voice notes, photos, videos, status updates, stickers, GIFs.
- **Instagram**: Direct Messages, call activity, story media, post interactions.
- **Telegram / Signal**: Text messages, notifications, media files, call logs.
- **Facebook Messenger / Skype / Viber / LINE / IMO**: Text chats, media attachments, call logs, call recording (Phase 2/3).
- **Email Clients (Gmail, Yahoo, Outlook)**: Incoming/outgoing mail headers, subject, snippet, timestamp via notification & accessibility listeners.

---

## 8. Real-Time Communication & SSE Architecture

For real-time dashboard updates without client polling, the system implements **Server-Sent Events (SSE)** supplemented by Firebase Cloud Messaging (FCM):

```text
  [ Web Dashboard ] <========= SSE (Server-Sent Events Stream) ========= [ NestJS Backend ]
   (Live GPS Map,                                                          │
    Instant Alerts,                                                        │ Push Command
    Sync Indicators)                                                       v
                                                                    [ FCM Server ]
                                                                           │
                                                                           │ Wake Up / Sync Now
                                                                           v
                                                                    [ Android Agent ]
```

1. **Dashboard Subscription**: When a parent or enterprise admin opens the dashboard, a single persistent SSE connection is established to `/api/v1/realtime/stream?deviceId=xyz`.
2. **Device Push Commands**: Remote actions (Sync Now, Live Surround Audio Request, Instant Screen Capture, App Block) send an FCM high-priority payload to wake the Android Agent immediately.
3. **Agent Action & Stream Update**: The agent executes the command, uploads the resulting payload, and the Backend emits an SSE event directly to all active dashboard clients listening to that device.

---

## 9. Backend Modular Architecture & Separation of Concerns (SoC)

The Backend (`/backend`) is built with NestJS using Domain-Driven Design (DDD) and Layered Clean Architecture. Business logic, transport protocols, data access, and infrastructure integrations are strictly isolated.

```text
                                BACKEND LAYERED ARCHITECTURE
+-----------------------------------------------------------------------------------+
|                        PRESENTATION LAYER (Controllers & SSE)                     |
|  REST Controllers | SSE Streams | DTO Validation Pipes | OpenAPI Specs            |
+-----------------------------------------------------------------------------------+
|                        APPLICATION LAYER (Services & Use-Cases)                   |
|  Business Workflows | Event Normalization | Policy Evaluators | Commands         |
+-----------------------------------------------------------------------------------+
|                        PERSISTENCE LAYER (Repositories & Data Models)             |
|  PostgreSQL ORM Schemas | Database Repositories | Redis Cache Adapters            |
+-----------------------------------------------------------------------------------+
|                        INFRASTRUCTURE LAYER (External Services)                   |
|  S3 / R2 Media Storage | FCM Push Engine | BullMQ Job Queues | Mailer             |
+-----------------------------------------------------------------------------------+
```

### Backend Directory Structure & Layer Responsibilities:

```text
backend/
├── src/
│   ├── config/                      # Environment variables, database configs, Redis configs
│   ├── common/                      # Shared cross-cutting concerns
│   │   ├── decorators/              # Custom decorators (@CurrentUser, @Roles, @RequireDeviceAuth)
│   │   ├── filters/                 # Global exception filters (HttpExceptionFilter)
│   │   ├── guards/                  # Auth Guards (JwtAuthGuard, RolesGuard, DeviceTokenGuard)
│   │   ├── interceptors/            # LoggingInterceptor, TransformInterceptor, TimeoutInterceptor
│   │   └── utils/                   # Crypto helpers, RSA key generator, Hashing
│   │
│   ├── database/                    # Database migrations, ORM schemas, seeds
│   │   ├── migrations/
│   │   ├── schemas/                 # PostgreSQL database entities & schemas
│   │   └── seeders/
│   │
│   ├── infrastructure/              # External third-party adapters (Strictly decoupled)
│   │   ├── storage/                 # S3 / Cloudflare R2 Service (presigned URLs, hash validation)
│   │   ├── fcm/                     # Firebase Cloud Messaging Service (push commands)
│   │   ├── queues/                  # BullMQ job queues (media processing, telemetry retention purge)
│   │   └── mail/                    # Email service (OTP, password reset, security alerts)
│   │
│   ├── modules/                     # Domain Feature Modules (Isolated Bounded Contexts)
│   │   ├── auth/                    # Auth Module (Login, Register, 2FA, Token Refresh)
│   │   │   ├── dto/                 # Data Transfer Objects with class-validator
│   │   │   ├── controllers/         # HTTP Handlers (No business logic)
│   │   │   ├── services/            # Business Logic & Token Management
│   │   │   └── strategies/          # Passport JWT Strategies
│   │   │
│   │   ├── devices/                 # Device Enrollment & Capability Matrix
│   │   │   ├── dto/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── repositories/        # Database query abstractions
│   │   │
│   │   ├── telemetry/               # Event Ingestion & Collector Receiver
│   │   │   ├── dto/
│   │   │   ├── controllers/         # Telemetry HTTP endpoints
│   │   │   ├── services/            # Normalization & parsing engine
│   │   │   └── processors/          # Queue workers for heavy telemetry
│   │   │
│   │   ├── policies/                # App Restrictions, Web Filters, Geofencing
│   │   ├── media/                   # Media Metadata & Storage Controller
│   │   ├── realtime/                # SSE Stream Gateway & WebSockets
│   │   ├── reports/                 # Analytics, Usage Stats, Aggregations
│   │   └── admin/                   # Platform Tenants, Subscriptions, Audit Logs
│   │
│   ├── app.module.ts
│   └── main.ts
```

### Storage Layer Distribution:
- **PostgreSQL**: Account metadata, registered devices, normalized event records, call logs, SMS metadata, location logs, web history, audit trails.
- **S3 / Cloudflare R2 / MinIO**: Binary media (photos, audio files, surround recordings, screenshots, call recordings, document attachments).
- **Redis (BullMQ)**: Async background job queues, rate limiting, SSE connection registry, device state caching.

---

## 10. Web Application Architecture & Separation of Concerns

To ensure maximum security, operational isolation, and clean user experience, the web layer is divided into **two standalone web applications**:

1. **Client Dashboard** (`/client-dashboard`) — Dedicated customer portal for Parents & Business/Enterprise clients.
2. **Admin Dashboard** (`/admin-dashboard`) — Dedicated internal portal for System Admins, Support Staff, Operations, and Billing.

Both web applications are built with Vite, React (TypeScript), Tailwind CSS, and Shadcn UI, adhering to strict **Layered Component Architecture**.

---

### 10A. Client Dashboard (`/client-dashboard`)

Serves end-user parents and corporate company managers monitoring target devices.

```text
client-dashboard/
├── src/
│   ├── config/                      # API base URL, SSE endpoints, default maps
│   ├── types/                       # Shared DTO contracts (Auth, Device, Telemetry, Policy)
│   ├── utils/                       # Date formatters, file sizing, map projections
│   ├── services/
│   │   ├── api/                     # Axios HTTP client (auth, device, telemetry, policy)
│   │   └── sse/                     # Reconnecting SSE client for live location & alerts
│   ├── store/                       # Client UI state (Zustand: auth, active device, map bounds)
│   ├── hooks/                       # Custom hooks (useLiveLocation, useSseStream, useTelemetry)
│   ├── components/
│   │   ├── ui/                      # Atomic Shadcn components (Button, Card, Modal, Input)
│   │   ├── common/                  # Header, Sidebar, PortalToggle (Parent vs Business mode)
│   │   └── features/
│   │       ├── location/            # LiveMap, RouteHistoryPlayer, GeofenceDrawer
│   │       ├── telemetry/           # CallLogsTable, SmsTimeline, ChatBubbleViewer (WhatsApp/IG)
│   │       ├── media/               # PhotoGallery, AmbientAudioPlayer, ScreenshotViewer
│   │       └── policies/            # AppRestrictionToggle, WebCategoryFilter, SchedulePicker
│   ├── views/
│   │   ├── auth/                    # Client Login, Register, Device Pairing Wizard
│   │   ├── parent/                  # ChildOverview, ScreenTimePage, WebSafetyPage, LiveTracking
│   │   └── business/                # FleetOverview, MDMManagement, EmployeeCompliance
│   ├── routes/                      # React Router (ProtectedRoute, ClientLayout)
│   ├── App.tsx
│   └── main.tsx
```

#### Client Portals:
- **Parent Portal**: Child device live location, screen-time controls, web content filtering, social media timeline viewer (WhatsApp, Instagram, Telegram), call/SMS inspector, ambient audio player.
- **Business / Enterprise Portal**: Employee fleet map, departmental policy deployment (Kiosk mode, app blacklists), security compliance monitor, audit trail viewer.

---

### 10B. Admin Dashboard (`/admin-dashboard`)

Serves internal company operations, support teams, billing managers, and system administrators. Completely isolated from client-facing assets.

```text
admin-dashboard/
├── src/
│   ├── config/                      # Internal Admin API base URL, Admin SSE stream endpoints
│   ├── types/                       # Admin DTOs (Tenant, Subscription, License, SystemHealth)
│   ├── utils/                       # Metric formatters, storage byte convertor, JSON inspect
│   ├── services/
│   │   ├── api/                     # Axios Admin HTTP client with elevated auth headers
│   │   └── sse/                     # Admin System SSE stream (Real-time telemetry rates, server logs)
│   ├── store/                       # Admin Auth Store (Admin roles: SuperAdmin, Support, Billing)
│   ├── hooks/                       # Admin Hooks (useTenants, useSystemMetrics, useLicenseKeys)
│   ├── components/
│   │   ├── ui/                      # Atomic Shadcn components (MetricCard, LogViewer, JsonEditor)
│   │   ├── common/                  # Admin Header, Staff Navigation, RoleBadge
│   │   └── features/
│   │       ├── tenants/             # CustomerAccountTable, OrganizationProvisioner
│   │       ├── billing/             # SubscriptionManager, LicenseKeyGenerator, PlanQuotaEditor
│   │       ├── metrics/             # EventIngestionChart, S3BucketSizing, SSEConnectionGauge
│   │       ├── support/             # RemoteCapabilityInspector, DeviceDiagnosticConsole
│   │       └── audit/               # ImmutableAuditLogTable, FeatureFlagSwitchGrid
│   ├── views/
│   │   ├── auth/                    # Admin Multi-Factor Login
│   │   ├── tenants/                 # Tenant Overview & Customer Account Management
│   │   ├── billing/                 # Subscriptions & License Management
│   │   ├── metrics/                 # Real-time System Metrics & Storage Sizing
│   │   ├── support/                 # Technical Support Diagnostics & Remote Device Debug
│   │   └── audit/                   # Audit Logs & Global Feature Flags
│   ├── routes/                      # Admin Route Guard (SuperAdminGuard, SupportGuard)
│   ├── App.tsx
│   └── main.tsx
```

#### Admin Portals & Tools:
- **Customer & Tenant Management**: Provision, suspend, or upgrade parent and business organization accounts.
- **Billing & Subscriptions**: Generate plan license keys, view Stripe transaction history, enforce device quotas.
- **System Metrics & Infrastructure**: Live charts monitoring PostgreSQL event ingestion rate, Redis job queue latency, active SSE connection counts, and S3 storage utilization.
- **Technical Support Diagnostics**: Inspect individual device capability matrices, check FCM push delivery status, analyze payload sync failures without accessing private message content.
- **Audit & Governance**: Immutable audit trail of administrative actions and global feature flag toggles.

---

## 11. Security, Compliance & Device Pairing Flow

### Pairing Protocol (Zero Plaintext Secrets):
```text
Parent/Admin Web Portal              Backend API                     Android Agent
         │                                │                                │
 1. Create Device Record                 │                                │
 ─────────────────────────►              │                                │
 2. Generate Pairing Code (6-digit)      │                                │
 ◄───────────────────────────────────────┤                                │
                                         │                    3. Enter Pairing Code
                                         │                    ◄────────────────────
                                         │ 4. Issue Temp Token & Device Keys
                                         ├────────────────────────────────►
                                         │                    5. Grant Android Permissions
                                         │                    6. Transmit Device Capabilities
                                         │ 7. Issue Permanent Device Auth │
                                         │    Token (Rotated via RSA Key) │
                                         ◄────────────────────────────────┤
```

### Security Safeguards:
- **Data Encryption in Transit**: TLS 1.3 for all HTTP REST, SSE, and S3 media upload calls.
- **Data Encryption at Rest**: SQLCipher database encryption on Android; encrypted S3 buckets with AES-256 server-side encryption.
- **Secure Media Downloads**: Media files are accessed exclusively via short-lived (15-minute expiry) signed S3 URLs generated by backend authorization guards.
- **Uninstall Protection**: Device Admin activation on Android prevents non-authorized uninstallation without parent/admin authentication pin.

---

## 12. Retention & Data Cleanup Rules

- **Default Retention Period**: 30 Days (configurable per subscription tier).
- **Automated Scheduled Cleanup Job**: A daily background worker deletes database telemetry older than 30 days and issues batch delete calls to S3/Object Storage for associated media assets.
- **Audit Logging**: Every deletion execution writes an immutable audit record logging count of purged events and freed storage space.

---

## 13. Capability Detection Engine

The Android Agent dynamically inspects the host device upon initial boot and after every permission update:

```json
{
  "deviceId": "dev_98124719-ab82",
  "androidVersion": 14,
  "sdkInt": 34,
  "manufacturer": "Samsung",
  "model": "Galaxy S23",
  "capabilities": {
    "location": true,
    "callLogs": true,
    "sms": true,
    "contacts": true,
    "appUsage": true,
    "keylogger": true,
    "screenshots": true,
    "callRecordingSupported": false,
    "voipRecordingSupported": false,
    "whatsappNotifications": true,
    "whatsappAccessibility": true,
    "whatsappMedia": true,
    "deviceOwnerMode": true
  }
}
```

The Web Dashboard reads this matrix to render feature controls accurately, displaying warning badges for hardware-restricted capabilities (e.g., VoIP call recording on newer Android builds) rather than presenting non-functioning controls.

---

## 14. Critical Engineering Rules

1. **Explicit Application Isolation**: Android Agent, Backend API, Client Dashboard, and Admin Dashboard must remain cleanly separated in `/android-agent`, `/backend`, `/client-dashboard`, and `/admin-dashboard`.
2. **Never assume uniform Android capability**: Always query the `CapabilityManager` before invoking OS features.
3. **Local Queue Priority**: Never bypass local encrypted SQLCipher database storage during telemetry collection.
4. **Third-Party App Independence**: App collectors must be isolated modules without hardcoded core dependencies.
5. **Phase-Aligned Deliverables**: Engineering sprints must strictly honor feature milestones established in `plan-phase.md`.
6. **No Plaintext Storage**: Credentials, auth tokens, and local Room database records must be encrypted at all times.
7. **Graceful Failures**: System components must fail silently and retain local telemetry when network connectivity is lost.