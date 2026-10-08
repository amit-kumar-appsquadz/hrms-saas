# API Gaps — HRMS SaaS UI

Status: For review (planner). APIs the product UI requires that are **not yet in `openapi.yaml`**. Per steering rule 1, the Frontend agent consumes the contract and never invents endpoints. These gaps must be added to `openapi.yaml` by the planner **before** the matching sprint. This file is the backlog of contract work; it does **not** modify `openapi.yaml` (no missing API is being implemented here, only documented).

Conventions for all new endpoints (inherit from the Sprint 0 contract): tenant-agnostic paths (tenant from subdomain), `PaginatedEnvelope` on every list, `Error`/`ValidationErrorBody` shapes, bearer auth, sensitive fields `writeOnly`/masked (ADR-006), `page/per_page/q` + typed filters on lists.

Currently in contract: `/auth/*`, `/roles`, `/roles/{id}`, `/employees`, `/employees/{id}`.

## Sprint 2 — Auth/RBAC completion
- `POST /auth/password/forgot`, `POST /auth/password/reset`
- `POST /auth/activate` (invited user set-password)
- `POST /auth/mfa/setup`, `POST /auth/mfa/confirm`, `POST /auth/mfa/disable`, recovery-code regen
- `GET /permissions` (platform permission catalog for the matrix)
- `GET /roles/{id}/users`, `POST/DELETE /roles/{id}/users` (assignment)
- User mgmt: `GET/POST /users`, `GET/PUT /users/{id}`, `POST /users/invite`, `POST /users/{id}/activate|deactivate`, `POST /users/{id}/reset-password`, `GET/DELETE /users/{id}/sessions`, `GET /users/{id}/login-history`
- `GET /users/{id}/effective-permissions`

## Sprint 3 — Organization + employee extensions
- Org CRUD (each list + item): `/companies`, `/locations`, `/departments`, `/designations`, `/grades`
- `GET /org/hierarchy`, `GET /org/reporting-tree`
- `/holidays`, `/calendars` (work calendars)
- Employee extensions on the `Employee` schema: personal, contact, employment-detail, qualifications, experience, emergency-contacts, reportees list
- Custom fields: `GET/POST/PUT /custom-fields` (definitions), values via employee payload
- Employee lifecycle: `POST /employees/{id}/transfer|promote|change-manager|exit|reactivate`
- Onboarding orchestration: `/onboarding` (create candidate, checklist, status, complete)
- **Sensitive reveal + audit:** `POST /employees/{id}/reveal` (returns full PAN/bank for one record, permission-gated, writes an audit entry) — needed for the Bank/PAN tabs

## Sprint 4 — Audit, workflow, notifications
- Audit facade (MongoDB Atlas via `AuditLogStore`, ADR-003): `GET /audit`, `GET /audit/{entityType}/{entityId}`, `POST /audit/export`
- Workflow: `/workflow-definitions` CRUD, `GET /approvals` (my queue), `POST /approvals/{stepId}/act` (approve/reject/request-changes), `GET /workflow-instances`, `GET /workflow-instances/{id}`, `POST /workflow-instances/{id}/cancel`, delegation `GET/POST /delegations`
- Notifications: `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET/PUT /notification-preferences`, announcements `GET /announcements`
- Self-service change request: `POST /self-service/change-requests`

## Sprint 5 — Documents, self-service, import
- Documents: `GET /documents`, `GET /employees/{id}/documents`, `POST /documents/presign`, `POST /documents` (confirm metadata), `POST /documents/{id}/verify|reject`, `DELETE /documents/{id}`, `GET /documents/{id}/download` (presigned), `/document-categories` CRUD, `POST /documents/bulk` (queued)
- Bulk employee import: `POST /employees/import` (queued) + `GET /jobs/{id}` (job status) — generic **jobs** endpoint reused by all queued operations (import/export/bulk/payroll)

## Sprint 6 — Hardening
- `GET/PUT /preferences` (user UI prefs: saved views, column visibility, dashboard layout, sidebar)
- (Rate limiting S6-04 surfaces as `429` + `Retry-After` — already in contract responses)

## Sprint 7–8 — Leave
- `/leave-types`, `/leave-policies` CRUD; `GET /leave-balances`, `POST /leave-balances/adjust`, `POST /leave-accruals/run`
- `POST /leave-requests` (apply), `GET /leave-requests`, `POST /leave-requests/{id}/cancel`, approvals via workflow
- `GET /leave/team-calendar`, `GET /leave/holiday-calendar`

## Sprint 9–10 — Attendance
- `/shifts`, `/rosters`, `/attendance-policies` CRUD
- `POST /attendance/punch` (check-in/out + geo), `POST /attendance/ingest` (device/biometric → SQS), `GET /attendance/daily`, `GET /attendance/monthly`, `GET /me/attendance`
- `POST /regularizations`, `GET /regularizations` (approve via workflow)
- `GET /attendance/reports`, `GET /devices` (source mapping)

## Sprint 11–16 — Payroll & compliance
- Salary: `/salary-components`, `/salary-structures` CRUD; `GET/PUT /employees/{id}/compensation` (🔒)
- Runs: `POST /payroll-runs`, `GET /payroll-runs`, `GET /payroll-runs/{id}`, stage actions `POST /payroll-runs/{id}/validate|calculate|approve|lock|generate-payslips|publish`, `GET /payroll-runs/{id}/register`, `GET /payroll-runs/{id}/exceptions`
- Payslips: `GET /payslips`, `GET /me/payslips`, `GET /payslips/{id}/download`
- Payroll config: `GET/PUT /payroll-config`
- Compliance (config-driven, expert-verified): `/compliance/pf|esi|pt|tds|gratuity|bonus` config + computed views; `POST /compliance/ecr`, Form 24Q/16 generation; employee `POST /me/tax-declaration`, proof upload, `POST /tds-proofs/{id}/verify`
- Expense/loans/F&F (S16): `/expense-claims`, `/loans`, `/full-and-final`

## Cross-cutting (any sprint)
- `GET /dashboard/summary?widgets=` (or per-widget endpoints) — role-aware KPIs/panels
- `GET /search?q=&types=` — global search, server-side tenant + per-type permission filtering
- `GET /reports/*` + `POST /reports/{id}/export` (queued), `/saved-reports`, `/scheduled-reports`, custom-report metadata + run
- `GET /settings/*`, `PUT /settings/*` (tenant/company/localization/security/retention/notifications)
- Generic `GET /jobs/{id}` for all queued-job status (import/export/bulk/payroll/report)

## Platform console (Super Admin — cross-tenant SaaS operator)
These are **platform-level** endpoints, operating OUTSIDE the tenant subdomain model (ADR-001). They are served by a separate platform API surface and a platform-scoped auth/permission namespace (`platform.*`) that is **distinct from tenant `/auth/me`** — a platform operator is never a tenant role and vice versa. The frontend demo implements this console against the demo layer (`src/lib/demo/platform.ts`); these endpoints must be added by the planner before any live platform build.

- **Platform auth:** `POST /platform/auth/login`, `POST /platform/auth/mfa/verify`, `GET /platform/auth/me` (platform identity + `platform.*` permissions), `POST /platform/auth/logout`. Separate token/session from tenant Sanctum.
- **Platform dashboard:** `GET /platform/summary` — tenant counts (total/active/trial/suspended), total employees across tenants, MRR, tenant-growth trend, usage-by-plan, status split, system health, recent platform activity, security alerts.
- **Tenant management:** `GET /platform/tenants` (paginated; filters `status`, `plan`, `q`), `GET /platform/tenants/{id}`, `POST /platform/tenants` (provision), `PUT /platform/tenants/{id}`, `POST /platform/tenants/{id}/activate`, `POST /platform/tenants/{id}/suspend`. Returns subdomain, status, plan, employees, companies, MRR, usage (storage/API calls), region, health.
- **Tenant onboarding:** `POST /platform/onboarding` (customer info, subdomain availability check, plan, initial tenant-admin invite), `GET /platform/onboarding` (in-flight), stage/progress tracking → triggers provisioning + tenant-admin activation (`/auth/activate`).
- **Platform users:** `GET/POST /platform/users`, `PUT /platform/users/{id}`, invite/deactivate, MFA status. Platform roles catalog: Super Admin, Platform Operator, Support Engineer, Billing Admin.
- **Platform audit:** `GET /platform/audit` (paginated; filter by category: tenant_lifecycle, platform_config, security, billing, access) — tenant creation/activation/suspension, platform config changes, impersonation sessions, platform-user access; actor, timestamp, IP/device.
- **Plans & settings:** `GET/PUT /platform/plans`, `GET/PUT /platform/settings` (onboarding defaults, default region, platform session/MFA policy, support identity).
- **Tenant impersonation ("View tenant"):** `POST /platform/tenants/{id}/impersonate` → a scoped, time-boxed, **audited, consent-gated** session into the tenant workspace for support. In the demo this is a labelled client-side affordance only; production must enforce authorization, audit every session (ADR-003), and never silently grant platform permissions inside the tenant (or vice versa).

## Notes
- Each gap must land in `openapi.yaml` **before** its sprint's frontend task starts, with schemas reconciled against `docs/data-model.md`. Contract changes go through the planner (steering rule 1).
- Sensitive endpoints (`reveal`, compensation, payslips, audit-with-sensitive) must specify masking + the required permission + that access is audited (ADR-006).
- Money/statutory endpoints are `needs-expert` (steering rule 5); the UI only consumes their outputs.
