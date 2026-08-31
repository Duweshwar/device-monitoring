# AGENT.md — Backend API & Services Specification

## 1. Overview & Objectives

The **Backend API Server** (`/backend`) is the central control plane, event ingestion server, policy enforcement engine, and real-time event distribution platform for the Parental & Enterprise Phone Monitoring system.

---

## 2. Technology Stack

- **Framework**: NestJS (Node.js / TypeScript)
- **Database ORM**: PostgreSQL + **Prisma ORM** (Declarative schema, migrations, auto-generated TypeScript client)
- **Cache & Message Broker**: Redis + BullMQ (Job queues, rate limiting, SSE connection registry)
- **Object Storage**: **Cloudflare R2** (S3-compatible, zero egress bandwidth costs)
- **Real-Time Streaming**: Server-Sent Events (`@Sse()`) via RxJS observables + WebSockets
- **Push Messaging**: Firebase Cloud Messaging (FCM Admin SDK)
- **Security & Auth**: Passport.js (JWT, Refresh Token rotation, 2FA/OTP), Argon2/Bcrypt password hashing, AES-256 GCM encryption

---

## 3. Directory Structure & Domain Modules

```text
backend/
├── src/
│   ├── config/                      # App configuration, database, Redis, S3, FCM settings
│   ├── common/                      # Shared cross-cutting concerns
│   │   ├── decorators/              # Custom decorators (@CurrentUser, @Roles, @RequireDeviceAuth)
│   │   ├── filters/                 # Global exception filters (HttpExceptionFilter, AllExceptionsFilter)
│   │   ├── guards/                  # Auth Guards (JwtAuthGuard, RolesGuard, DeviceTokenGuard)
│   │   ├── interceptors/            # LoggingInterceptor, TransformInterceptor, TimeoutInterceptor
│   │   ├── middleware/              # Request ID tracking, Security headers
│   │   └── utils/                   # Crypto helpers, RSA key generator, Hashing
│   │
│   ├── database/                    # Database migrations, ORM schemas, seeds
│   │   ├── migrations/
│   │   ├── schemas/                 # Database entity definitions & schemas
│   │   └── seeders/
│   │
│   ├── infrastructure/              # Decoupled External Adapters
│   │   ├── storage/                 # S3 / Cloudflare R2 Service (upload signed URLs, deduplication)
│   │   ├── fcm/                     # Firebase Cloud Messaging Service (push triggers)
│   │   ├── queues/                  # BullMQ job queues (media processing, telemetry retention cleanup)
│   │   └── mail/                    # Email service (OTP verification, alerts, password resets)
│   │
│   ├── modules/                     # Domain Feature Modules (Domain-Driven Isolation)
│   │   ├── auth/                    # Auth Module (Login, Register, 2FA/OTP, Token Refresh)
│   │   │   ├── dto/                 # Validation DTOs (class-validator)
│   │   │   ├── controllers/         # Transport layer HTTP endpoints
│   │   │   ├── services/            # Business logic & JWT handling
│   │   │   └── strategies/          # Passport JWT strategies
│   │   │
│   │   ├── devices/                 # Device Enrollment, Capability Matrix & Licensing
│   │   │   ├── dto/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── repositories/        # Database query abstractions
│   │   │
│   │   ├── telemetry/               # Telemetry Ingestion & Event Processor
│   │   │   ├── dto/
│   │   │   ├── controllers/         # High-throughput batch ingestion endpoints
│   │   │   ├── services/            # Event normalization & parsing
│   │   │   └── processors/          # Telemetry processing workers
│   │   │
│   │   ├── policies/                # App Restrictions, Web Filters, Geofencing
│   │   ├── media/                   # Pre-signed S3 Upload Controller & Hash Verification
│   │   ├── realtime/                # SSE Stream Gateway & FCM Push Command Service
│   │   ├── reports/                 # Activity Timelines, Usage Charts, Aggregations
│   │   ├── subscriptions/           # SaaS Plans, Payment Webhooks, Device Quota Checks
│   │   └── admin/                   # Platform Tenants, System Metrics, Audit Logs
│   │
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

---

## 4. Key Architectural Standards

1. **Strict Separation of Concerns**: Controllers handle ONLY request validation and transport. All business rules belong in Services, database logic belongs in Repositories, and third-party APIs belong in `infrastructure/`.
2. **Event Normalization Model**: All raw events uploaded by the Android agent pass through `TelemetryService` and are stored as standardized `NormalizedEvent` records in PostgreSQL.
3. **Short-Lived Signed Media URLs**: Binary media files in S3 are NEVER exposed directly. The API generates temporary (15-minute expiration) signed URLs for authorized dashboard clients.
4. **Real-Time Streaming via SSE**: Real-time location updates, device status alerts, and push command completion statuses are streamed to dashboard clients via NestJS RxJS `@Sse()` endpoints.
5. **30-Day Retention Worker**: A daily BullMQ job purges telemetry and associated media assets older than 30 days, creating an audit log of freed storage.

---

## 5. Multi-Tenant Database Isolation Safeguards

To prevent cross-tenant data leaks between Parent families or Business corporate accounts:

1. **Prisma Client Extensions**: Use Prisma `$extends` query extensions to automatically inject `where: { familyId }` or `where: { organizationId }` into all telemetry, device, policy, and media queries based on the authenticated request context.
2. **Role-Based Access Control Guards**: `JwtAuthGuard` combined with `@Roles()` decorator enforces strict account type isolation (`PARENT`, `BUSINESS_ADMIN`, `SUPER_ADMIN`).

---

## 6. Local Development Environment (`docker-compose.yml`)

The repository root includes a `docker-compose.yml` for local development setup:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: parental_user
      POSTGRES_PASSWORD: parental_password
      POSTGRES_DB: parental_monitoring_db
    ports:
      - '5432:5432'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_password
    command: server /data --console-address ":9001"
    ports:
      - '9000:9000'
      - '9001:9001'
```
