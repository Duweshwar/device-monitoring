# AGENT.md — Admin Dashboard Specification

## 1. Overview & Objectives

The **Admin Dashboard** (`/web-dashboard/admin-dashboard`) is the internal control center for the Parental & Enterprise Phone Monitoring system. It is used exclusively by internal company personnel: Platform SuperAdmins, Customer Support Representatives, Operations Engineers, and Billing Managers.

---

## 2. Technology Stack

- **Framework**: Vite + React 18+ (TypeScript) SPA
- **Styling**: Tailwind CSS + Shadcn UI + Lucide Icons
- **System Analytics & Charts**: Recharts / Tremor (DB event ingestion rates, Redis queue latency, SSE connections gauge, S3 storage utilization)
- **HTTP Client**: Axios with elevated admin auth headers & MFA validation
- **Real-Time Feed**: Admin SSE Stream connecting to `/api/v1/admin/metrics/stream`
- **State Management**: Zustand (Admin Auth, role permissions) + TanStack Query (Server cache)

---

## 3. Directory Structure & Separation of Concerns

```text
admin-dashboard/
├── src/
│   ├── assets/                      # Internal branding assets
│   ├── config/                      # Internal Admin API base URL, Admin SSE stream endpoints
│   ├── types/                       # Admin DTOs (Tenant, Subscription, License, SystemHealth)
│   ├── utils/                       # Metric formatters, storage byte convertor, JSON inspectors
│   │
│   ├── services/                    # Infrastructure & Admin API Services
│   │   ├── api/                     # Axios Admin HTTP client (auth, tenants, billing, metrics)
│   │   └── sse/                     # Admin System SSE Stream manager
│   │
│   ├── store/                       # Admin State (Zustand: SuperAdmin, Support, Billing roles)
│   ├── hooks/                       # Admin Hooks (useTenants, useSystemMetrics, useLicenseKeys)
│   │
│   ├── components/                  # UI Component Hierarchy
│   │   ├── ui/                      # Atomic Shadcn components (MetricCard, LogViewer, JsonEditor)
│   │   ├── common/                  # Admin Header, Staff Navigation, RoleBadge
│   │   └── features/
│   │       ├── tenants/             # CustomerAccountTable, OrganizationProvisioner
│   │       ├── billing/             # SubscriptionManager, LicenseKeyGenerator, PlanQuotaEditor
│   │       ├── metrics/             # EventIngestionChart, S3BucketSizing, SSEConnectionGauge
│   │       ├── support/             # RemoteCapabilityInspector, DeviceDiagnosticConsole
│   │       └── audit/               # ImmutableAuditLogTable, FeatureFlagSwitchGrid
│   │
│   ├── views/                       # Route Controllers
│   │   ├── auth/                    # Admin Multi-Factor Login
│   │   ├── tenants/                 # Tenant Overview & Customer Account Management
│   │   ├── billing/                 # Subscriptions & License Key Generator
│   │   ├── metrics/                 # Real-time System Health & Storage Sizing
│   │   ├── support/                 # Technical Support Diagnostics & Remote Debug Console
│   │   └── audit/                   # System Audit Logs & Global Feature Flags
│   │
│   ├── routes/                      # Admin Route Guard (SuperAdminGuard, SupportGuard)
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## 4. Key Feature Specifications

1. **Tenant & Account Management**: Search, provision, suspend, or upgrade parent and business organization accounts.
2. **License Key Generator & Billing**: Issue custom plan license keys, manage subscription tiers, enforce maximum device limits per tenant.
3. **System Metrics & Infrastructure Health**: Live monitoring charts displaying event ingestion rate (events/sec), Redis job queue processing latency, active SSE connection counts, and S3 bucket storage growth.
4. **Technical Support & Capability Diagnostic Console**: Inspect specific device capability matrices, FCM push delivery logs, payload parsing errors (privacy protected without exposing private message content).
5. **Audit Logs & Feature Flags**: View immutable system admin action logs and toggle global system feature flags dynamically.
