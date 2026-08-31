# AGENT.md — Web Dashboard Suite Architecture Overview

## 1. Overview & Objectives

The **Web Dashboard Suite** (`/web-dashboard`) contains the front-end web applications for the Parental & Enterprise Phone Monitoring platform.

To guarantee operational isolation, security, and tailored user experience, the web layer is split into **two distinct applications**:

1. **Client Dashboard** (`/web-dashboard/client-dashboard`) — Web Portal for Parents & Corporate Enterprise Clients.
2. **Admin Dashboard** (`/web-dashboard/admin-dashboard`) — Web Portal for Internal Company Staff (SuperAdmins, Support, Billing, Ops).

---

## 2. Directory Structure

```text
web-dashboard/
├── docs/                              # Overview Documentation (This file)
│   └── AGENT.md
│
├── client-dashboard/                  # Customer Portal Application
│   ├── docs/                          # Detailed Client Dashboard Spec
│   │   └── AGENT.md
│   ├── src/                           # React SPA source code
│   ├── package.json
│   └── vite.config.ts
│
└── admin-dashboard/                   # Internal Admin Application
    ├── docs/                          # Detailed Admin Dashboard Spec
    │   └── AGENT.md
    ├── src/                           # React SPA source code
    ├── package.json
    └── vite.config.ts
```

---

## 3. Shared Technology Stack & Architectural Principles

Both web applications share standard technology choices and design principles:

- **Build Tool & Framework**: Vite + React 18+ (TypeScript) SPA
- **Styling & Components**: Tailwind CSS + Shadcn UI + Lucide Icons
- **Real-Time Integration**: Native Reconnecting SSE (Server-Sent Events) Stream Client
- **HTTP Client**: Axios with request/response interceptors for automatic JWT renewal
- **State Management**:
  - `Zustand`: Client UI state (Auth tokens, active device, sidebar toggles, theme)
  - `TanStack Query (React Query)`: Server state caching & background refetching
- **Layered Architecture**: Strict separation between Views (`src/views`), Components (`src/components`), Custom Hooks (`src/hooks`), and Services (`src/services`).
