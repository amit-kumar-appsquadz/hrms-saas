# FE-DEMO-02 — Super Admin / Platform Administration console (frontend demo)

## What changed
Added a complete, separate **Platform Administration (Super Admin)** demo experience to the Next.js
frontend. The platform console is the SaaS-operator view across all tenants; it is modelled as a
distinct application area with its own entry, session, shell, navigation and permission namespace —
**not** as another tenant role. The existing tenant application and its demo roles (Tenant Admin, HR
Admin, Manager, Payroll Admin, Employee) are unchanged.

Backend untouched. No production API invented — all platform data is served by the existing
centralized demo-service architecture, and the required future endpoints are documented in
`docs/ui/API_GAPS.md § Platform console`.

## Security model (platform vs tenant)
- **Super Admin = platform-level SaaS operator** (cross-tenant, outside any tenant subdomain).
- **Tenant Admin / HR Admin / Manager / Employee = tenant-level roles.**
- Separation is enforced structurally, not by convention:
  - Platform permissions live in their own namespace `platform.*` (`services/platformAuth.ts`),
    completely separate from the tenant `/auth/me` permission set.
  - Platform session is a separate localStorage key (`lib/session.ts`), guarded by a separate
    `PlatformSessionProvider` + `CanPlatform`.
  - A unit test asserts the platform identity contains only `platform.*` perms and no tenant perms.

## Entry & navigation flow
```
/login → "Platform operator sign in" → /platform/login
  → Platform console (/platform)
    → Tenants (/platform/tenants) → "View tenant"
      → existing tenant app (/dashboard) with an impersonation banner
        → Tenant Admin / HR Admin / Manager / Employee experience (unchanged)
      → "Exit to platform" → back to /platform/tenants
```

## Screens added (8 platform routes)
- `/platform/login` — platform operator sign-in (separate from tenant login; demo-backed).
- `/platform` — platform dashboard: total/active/trial/suspended tenants, total employees, MRR,
  tenant-growth line, tenants-by-plan + status donuts, system health, recent activity, security alerts.
- `/platform/tenants` — tenant list with search + status + plan filters, pagination, status badges;
  row actions **View tenant** (impersonation) and open detail.
- `/platform/tenants/[id]` — tenant detail tabs (Overview, Tenant admin, Subscription, Usage,
  Activity, Audit); **Activate/Suspend** lifecycle actions (typed confirm on suspend); View tenant.
- `/platform/onboarding` — 5-step provisioning wizard (customer info → subdomain → plan → initial
  tenant admin → review) + in-flight onboarding panel with progress.
- `/platform/users` — platform users (Super Admin / Operator / Support / Billing), MFA + status.
- `/platform/audit` — platform audit log with category filter (tenant lifecycle, platform config,
  security, billing, access), actor, timestamp, IP/device.
- `/platform/settings` — subscription plans, onboarding defaults, system settings.

## Components created
- Providers: `PlatformSessionProvider` (+ `CanPlatform`, platform role preview switcher).
- Shell: `PlatformShell` (visually distinct dark chrome, platform sidebar/topbar, "Demo · Platform
  administration" label, link back to tenant workspaces), `ImpersonationBanner` (shown inside the
  tenant app during a "View tenant" session).
- Lib: `lib/platformNavigation.ts`, `lib/impersonation.ts`; `lib/session.ts` extended with separate
  platform-session + impersonation keys.
- Types/data/services: `types/platform.ts`, `lib/demo/platform.ts` (14 realistic tenants + onboarding
  + users + audit + plans + alerts + summary), `services/platform.ts`, `services/platformAuth.ts`.
- Reused existing UI primitives throughout: DataTable, ListPage, StatCard, Charts, Tabs, Stepper,
  Timeline, Card, StatusBadge/Pill, ConfirmDialog, Form fields, useAsync, format/status helpers.

## Reused vs new
- **Reused** the entire design system, the four-states/DataTable/ListPage patterns, charts, and the
  demo-service abstraction — no duplicate components.
- **New** only where the platform concept genuinely differs: platform session/permissions, platform
  shell chrome, platform nav, platform data/types/services, and the impersonation plumbing.

## Docs updated
- `docs/ui/API_GAPS.md` — new "Platform console" section listing all required future platform
  endpoints (auth, summary, tenants CRUD + activate/suspend, onboarding, users, audit, plans/settings,
  impersonation), with the platform-vs-tenant separation and audited-impersonation notes.
- `docs/ui/NAVIGATION.md` — platform tree expanded; new "Platform vs tenant separation (IMPLEMENTED)"
  section with the entry flow.
- `docs/ui/PAGE_INVENTORY.md` — Platform section updated from "pending scope" to the implemented page
  list with routes, perms and components.

## Tenant impersonation ("View tenant")
A clearly labelled **demo-only** affordance so the client can demonstrate entering a tenant. It sets a
demo impersonation context + a tenant session and routes into the existing tenant app, where an amber
banner states the active tenant and offers "Exit to platform". It does not grant platform permissions
inside the tenant (or vice versa). Production equivalent (audited, consent-gated, time-boxed support
session) is documented as an API gap.

## Quality status
- `npm run typecheck` — passes (strict).
- `npm test` — 22 tests pass (added 6 platform tests incl. the platform-vs-tenant permission isolation
  assertion).
- `npm run build` — succeeds; 93 routes (8 new platform routes); platform first-load ~108–115 kB.
- `npm run lint` — no warnings or errors.
- No route conflict between `(auth)/platform/login` and the `(platform)` group.

## How to verify
```
cd frontend
npm run dev
```
Open `/login` → click **"Platform operator sign in"** → sign in (any password) → explore the Platform
console. From **Tenants**, use **View tenant** to enter a tenant workspace (note the impersonation
banner) → **Exit to platform** to return. Tenant demo roles still work via the tenant login + "View as"
switcher.

## Remaining work / dependencies
- Planner: add the platform endpoints in `API_GAPS.md § Platform console` to a platform API surface.
- Backend: implement platform auth + tenant lifecycle + audited impersonation (out of scope here; not
  modified). Security review of the impersonation model before any live build.
- The platform console is intentionally separate from the tenant subdomain model; hosting/routing for
  a real `admin.app.example.com`-style console is a DevOps/infra concern.
