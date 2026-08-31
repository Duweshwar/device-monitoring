# AGENT.md — Shared Types Workspace Package Specification

## 1. Overview & Purpose

The **Shared Types Package** (`/packages/shared-types`) is an internal workspace library (`@parental/shared-types`) providing 100% type safety and contract synchronization across the entire TypeScript stack (`/backend`, `/web-dashboard/client-dashboard`, and `/web-dashboard/admin-dashboard`).

---

## 2. Directory Structure & Module Exports

```text
packages/shared-types/
├── docs/
│   └── AGENT.md                     # Shared Types Specification (This file)
├── src/
│   ├── events/                      # Telemetry & Event Normalization Types
│   │   ├── event.types.ts           # NormalizedEvent, EventType, CollectionMethod
│   │   ├── calls.types.ts           # CallLogPayload, CallDirection
│   │   ├── sms.types.ts             # SmsPayload
│   │   ├── location.types.ts        # LocationPayload, GeofenceAlertPayload
│   │   └── social.types.ts          # ChatMessagePayload (WhatsApp, IG, Telegram)
│   │
│   ├── capability/                  # Device Hardware & Capability Matrix
│   │   └── capability.types.ts      # DeviceCapabilityMatrix, AudioCaptureMode
│   │
│   ├── auth/                        # Authentication & Pairing Contracts
│   │   ├── auth.types.ts            # JwtPayload, LoginResponse, PairingRequest
│   │   └── roles.types.ts           # UserRole, AccountType (Parent, Business, Admin)
│   │
│   ├── realtime/                    # Server-Sent Events (SSE) Stream Types
│   │   └── sse-events.types.ts      # SseStreamEvent, SseEventType, PushCommandPayload
│   │
│   ├── policy/                      # Device Restrictions & Web Filtering
│   │   └── policy.types.ts          # AppRestrictionRule, WebFilterRule, GeofenceRule
│   │
│   └── index.ts                     # Main entry barrel file
├── package.json
└── tsconfig.json
```

---

## 3. Core Contract Examples

### Normalized Event Interface (`events/event.types.ts`)
```typescript
export enum CollectionMethod {
  ANDROID_API = 'android_api',
  NOTIFICATION = 'notification',
  ACCESSIBILITY = 'accessibility',
  MEDIA = 'media',
  DEVICE_POLICY = 'device_policy',
  USER_ACTION = 'user_action',
}

export interface NormalizedEvent<T = Record<string, any>> {
  eventId: string;
  deviceId: string;
  organizationId?: string;
  familyId?: string;
  source: string; // 'whatsapp' | 'instagram' | 'location' | 'calls' | 'sms'
  eventType: string;
  timestamp: string;
  collectionMethod: CollectionMethod;
  payload: T;
}
```

### Capability Matrix Interface (`capability/capability.types.ts`)
```typescript
export enum AudioCaptureMode {
  TWO_WAY_HARDWARE = 'two_way_hardware', // Full 2-way call recording
  MIC_FALLBACK = 'mic_fallback',          // Mic capture during call
  SURROUND_ONLY = 'surround_only',        // Ambient surround recording only
  UNSUPPORTED = 'unsupported',
}

export interface DeviceCapabilityMatrix {
  deviceId: string;
  androidVersion: number;
  sdkInt: number;
  manufacturer: string;
  model: string;
  capabilities: {
    location: boolean;
    callLogs: boolean;
    sms: boolean;
    contacts: boolean;
    appUsage: boolean;
    keylogger: boolean;
    screenshots: boolean;
    audioCaptureMode: AudioCaptureMode;
    whatsappNotifications: boolean;
    whatsappAccessibility: boolean;
    whatsappMedia: boolean;
    deviceOwnerMode: boolean;
  };
}
```

---

## 4. Workspaces & Integration Guide

1. Root `package.json` specifies `"workspaces": ["backend", "web-dashboard/*", "packages/*"]`.
2. Consuming applications depend on `"@parental/shared-types": "workspace:*"` in their `package.json`.
3. Ensures zero duplication of API DTOs, data models, or real-time event definitions.
