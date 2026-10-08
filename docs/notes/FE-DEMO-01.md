# FE-DEMO-01 — HRMS SaaS frontend (Next.js) client-demo build

## What changed
Scaffolded a complete, client-demo-ready HRMS SaaS frontend under `frontend/` (Next.js 14 App Router, TypeScript strict, Tailwind). The application boots to a login experience, enters a role-aware authenticated shell, and lets a client navigate the entire documented product — every major module, dashboards, tables, forms, workflows, reports, settings and employee/manager self-service — with no dead links.

Built against the authoritative specs in `docs/ui/*` and `openapi.yaml`. The contract is the source of truth; where an endpoint does not yet exist it is served by a clearly separated demo layer and the dependency is tracked (no endpoints were invented).

## Architecture (demo vs live)
```
UI → feature service (src/services) → (live API client | demo service) → data
```
- `NEXT_PUBLIC_DATA_MODE=demo` (default) routes services to `src/lib/demo` (centralized seed data).
- `NEXT_PUBLIC_DATA_MODE=live` routes the three contract-backed areas (`/auth/*`, `/roles`, `/employees`) through the typed client in `src/lib/api/client.ts`.
- Contract types (`src/types/api.ts`) are hand-mirrored from `openapi.yaml` and kept separate from demo/UI domain types (`src/types/domain.ts`). Swapping a module to a real API changes only its service body — no UI rewrite.
- Tenant resolved from the subdomain in `middleware.ts` + `src/lib/tenant.ts` (ADR-001); no tenant id in URLs.
- Permission context from `GET /auth/me` via `SessionProvider`; `can`/`canAny` + `<Can>` gate nav, routes and actions. A demo role switcher (topbar) previews Tenant Admin / HR Admin / Payroll Admin / Manager / Employee.

## Screens added (~90 route families)
- Auth: login, MFA verify, forgot/reset password, activate; 403/404/500 system pages.
- Dashboard (role-aware KPIs, charts, activity).
- Organization: companies, locations, departments, designations, grades, org hierarchy, reporting tree, holidays, work calendars.
- Employees: list (search/filter/paginate), 19-tab profile, multi-step create, edit, onboarding pipeline, transfers, exits.
- Attendance: overview, daily, monthly matrix, regularizations (approval), shifts, reports.
- Leave: overview, approvals, balances, team calendar, types, policies, apply (self-service).
- Payroll: dashboard, components, structures, compensation (masked/reveal), runs list, 8-stage run stepper + register, payslips, exceptions, reports.
- Compliance: dashboard + PF/ESI/PT/TDS/gratuity/bonus config+computed views, statutory reports.
- Documents: all documents, categories, bulk upload (dropzone).
- Workflows: pending approvals inbox, definitions, instances + timeline detail, delegation.
- Reports: standard catalog, saved, scheduled.
- Audit: log viewer + before/after diff drawer.
- Settings: tenant/company, localization, notifications, security/MFA, data retention, custom fields.
- Self-service `/me/*`: dashboard, profile, attendance+punch, leave, payslips, documents, requests, tax declaration, announcements, notifications, personal settings.
- Manager `/team/*`: dashboard, members, attendance, approvals, requests, reports.

## Components created (reused across pages)
Design-system primitives in `src/components/ui`: Icon, Button, StatusBadge/Pill, Card, StatCard, four-states (Skeleton/Empty/Error/Restricted), DataTable (server-pagination, sort, responsive stacked cards), Toolbar (debounced search + filters), Form fields, Drawer/Modal/ConfirmDialog, Avatar, Tabs, PageHeader/Breadcrumbs, Charts (bar/donut/line/stacked), Timeline, Stepper. Shell: Sidebar, Topbar, GlobalSearch (⌘K), NotificationPanel, AppShell. Patterns: ListPage, ApprovalCard, OrgChart, MonthCalendar, Dropzone, ReportView, SystemErrorPage. Providers: SessionProvider (+`Can`), ToastProvider.

## APIs integrated vs demo
- Integrated against contract (live-ready): `/auth/login`, `/auth/mfa/verify`, `/auth/me`, `/auth/logout`, `/roles`, `/employees`, `/employees/{id}`.
- Demo-backed (documented gaps in `docs/ui/API_GAPS.md`): all other modules (org CRUD, onboarding/lifecycle, attendance, leave, payroll, compliance, documents, workflows, notifications, audit, reports, settings, dashboard summary, global search, user management). No new/invented endpoints.

## Compliance with steering rules
- Contract-first; no invented endpoints; gaps already catalogued in `API_GAPS.md`.
- Tenancy from subdomain; cache/no tenant id in URLs.
- Every list paginated + four-states; sensitive fields masked (PAN `XXXXX1234X`, bank last-4), reveal is explicit + flagged as audited (ADR-006); no plaintext PAN/bank/Aadhaar in client state.
- Payroll/compliance screens are display/config only with on-screen "expert-verified in production / draft" notices (steering rule 5).
- WCAG 2.2 AA: semantic landmarks, skip link, focus-visible, labelled controls, accessible tables/dialogs, status never color-only, reduced-motion honored.
- Frontend changes isolated to `frontend/`; no backend/infra/contract files modified.

## Quality status
- `npm run typecheck` — passes (strict).
- `npm test` — 16 tests pass (format, tenant resolution, status mapping, StatusBadge, employee demo service).
- `npm run build` — production build succeeds; ~90 routes; first-load JS ~107–122 kB.
- `npm run lint` — no warnings or errors.
- Navigation audit: every sidebar/self/team href resolves to a page; no dead links or blank screens.

## How to verify
```
cd frontend
npm install
npm run dev      # http://localhost:3000 → /login
```
Sign in with any password (email containing `mfa` → MFA step, code `123456`). Use the topbar "View as" switcher to preview role-aware navigation. Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` for the quality gates.

## Remaining work / dependencies
- Planner: add the documented API-gap endpoints to `openapi.yaml` per sprint so demo services can switch to `live`.
- Backend: implement those endpoints; money/statutory logic is `needs-expert` (steering rule 5).
- QA: cross-tenant isolation tests once live endpoints exist (demo is single-tenant simulated).
- Future polish: workflow visual builder (currently list + read-only), org-chart export, dark theme, persisted user preferences (prefs API gap), e2e tests for login+MFA / employee CRUD / apply-approve leave / payroll run.
```
