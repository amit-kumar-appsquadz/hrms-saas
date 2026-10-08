# HRMS SaaS — Frontend (Next.js)

Multi-tenant HRMS SaaS frontend for India, built with Next.js (App Router), TypeScript and Tailwind.
Implements the product specified in `../docs/ui/*` against the `../openapi.yaml` contract.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  → redirects to /login
```

Sign in with **any password**. The default email `demo.admin@acme.co.in` logs in directly.
Use an email containing `mfa` to exercise the MFA step (demo code `123456`).
In the top bar, the **"View as"** switcher previews role-aware navigation (Tenant Admin, HR Admin,
Payroll Admin, Manager, Employee).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript (strict) |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Unit + component tests (Vitest) |

## Demo vs live data

The app runs in **demo mode** by default so the whole product is navigable before every backend
endpoint exists. The data layer is cleanly separated:

```
UI → feature service (src/services) → (live API client | demo service) → data
```

- `NEXT_PUBLIC_DATA_MODE=demo` (default) — demo services (`src/lib/demo`).
- `NEXT_PUBLIC_DATA_MODE=live` — the typed client (`src/lib/api/client.ts`) for the endpoints that
  exist in `openapi.yaml` (`/auth/*`, `/roles`, `/employees`).

No endpoints are invented. Everything beyond the contract is a documented gap in
`../docs/ui/API_GAPS.md` and is served by the demo layer until the planner adds it to the contract.

See `.env.example` for configuration (`NEXT_PUBLIC_DATA_MODE`, `NEXT_PUBLIC_DEFAULT_TENANT`,
`NEXT_PUBLIC_API_BASE_URL`). Tenant is otherwise resolved from the subdomain (ADR-001).

## Structure

```
src/
  app/              # routes: (auth) unauthenticated, (app) authenticated shell
  components/
    ui/             # design-system primitives (Button, DataTable, Charts, …)
    shell/          # AppShell, Sidebar, Topbar, GlobalSearch, NotificationPanel
    patterns/       # ListPage, ApprovalCard, OrgChart, MonthCalendar, Dropzone, …
    providers/      # SessionProvider (+ Can), ToastProvider
  services/         # feature services (route to demo or live)
  lib/
    api/            # typed live client
    demo/           # centralized demo seed data + services
    config / tenant / format / status / navigation / session
  types/            # api.ts (contract mirror) + domain.ts (UI/demo models)
```
