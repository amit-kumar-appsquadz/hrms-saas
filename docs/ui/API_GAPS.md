# API Gaps — HRMS SaaS UI

Status: For review (planner). APIs the product UI requires that are **not yet in `openapi.yaml`**. Per steering rule 1, the Frontend agent consumes the contract and never invents endpoints. These gaps must be added to `openapi.yaml` by the planner **before** the matching sprint.

> **Contract-review update (v0.1.0-contract-review):** the **platform plane** (auth, tenant lifecycle, onboarding, platform users, platform audit, plans, settings — ADR-007/008) and **tenant auth-completion** (password forgot/reset, activate, MFA setup/confirm) have been **promoted into `openapi.yaml`** and are no longer gaps. See the "Promoted" markers below and `docs/ui/PLATFORM_API_SPEC.md` / `docs/ui/TENANT_ONBOARDING_SPEC.md`. Classification per brief §2: **A** = add to OpenAPI now, **B** = future gap, **C** = already in contract, **D** = needs architectural decision.

Each remaining gap below carries: endpoint · purpose · priority · dependency · implementation sprint · frontend consumer · backend consumer · compliance/security-review needed.

Conventions for all new endpoints: tenant-agnostic paths (tenant from subdomain), `PaginatedEnvelope` on every list, `Error`/`ValidationErrorBody` shapes, bearer auth, sensitive fields `writeOnly`/masked (ADR-006), `page/per_page/q` + typed filters on lists.

Currently in contract: `/auth/*` (incl. password/activate/mfa setup), `/roles`, `/employees`, and the full `/platform/*` surface.

## Sprint 2 — Auth/RBAC completion
- ✅ **Promoted (Class A, in contract):** `POST /auth/password/forgot`, `POST /auth/password/reset`, `POST /auth/activate`, `POST /auth/mfa/setup`, `POST /auth/mfa/confirm`.
- `POST /auth/mfa/disable`, recovery-code regen — Class A, B2, FE personal-settings, BE auth, security review yes.
- `GET /permissions` (permission catalog for the matrix) — Class A, B3.
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
These are **platform-level** endpoints operating OUTSIDE the tenant subdomain model (ADR-007), under `/platform/*` with the `platformAuth` scheme and the `platform.*` namespace — distinct from tenant `/auth/me`. Same base domain (no admin hostname — ADR-007 decision 2). Full spec: `docs/ui/PLATFORM_API_SPEC.md`; routing: `docs/ui/ROUTING_AND_SESSIONS.md`.

- ✅ **Promoted (Class A, in contract):** platform auth (`/platform/auth/login|mfa/verify|logout|me`), dashboard (`/platform/summary`), tenant management (`GET/POST /platform/tenants`, `GET/PUT /platform/tenants/{id}`, `.../admin`, `.../activate`, `.../suspend`, `.../reactivate`), **read-only access sessions** (`POST /platform/tenants/{id}/access-sessions`, `DELETE .../access-sessions/{sid}`), onboarding (`GET/POST /platform/onboarding`), platform users (`GET/POST /platform/users`), platform audit (`GET /platform/audit`), plans (`GET /platform/plans`), settings (`GET/PUT /platform/settings`). Backend B1–B3; FE platform console (built); **security review mandatory** (plane separation, token audience, MFA, read-only access-session enforcement).

- **Class D — deferred to a future decision (NOT in contract):**
  - **Write / full impersonation + delegated tenant actions** — explicitly deferred (ADR-007 §6). Phase 1 exposes only the **read-only** access session. Revisit post-pilot with a dedicated security review.
  - **Live billing integration** — subscription/invoice sync with a payment provider. Phase 1 is record-keeping only (`Subscription.billing_metadata` is the seam). No payment APIs invented.
  - **Configurable platform RBAC tables** — Phase 1 uses the fixed role enum; `PlatformAuthorizer` is the documented extension seam.

- **Policy (not an endpoint):** `inactive` tenant **retention period** needs legal/compliance sign-off (`platform_settings.inactive_retention_days`; NULL = no auto-purge). Non-blocking.

## Frontend demo intentionally ahead of the backend contract
Reconcile at live-switch (none of these are contract-backed yet beyond what is noted):
- **"View tenant" impersonation (FE-DEMO-02):** the demo sets a tenant session + banner with no reason/TTL/read-only enforcement. The contract replaces this with the **read-only access session** (`access-sessions`, mandatory reason, ≤15-min TTL, read-only, persistent banner). FE must call the new endpoint and drop the client-only impersonation shortcut.
- **Platform role labels:** demo uses Super Admin / Platform Operator / Support Engineer / Billing Admin; contract uses the fixed enum `PLATFORM_SUPER_ADMIN/SUPPORT/OPERATIONS/AUDITOR`. Map at live-switch.
- **Tenant status `inactive`:** demo lacks it; FE must add filter + badge + "offboarded" copy.
- **Demo auth/session (localStorage keys):** replaced by real `platformAuth`/`tenantAuth` tokens with audience checks.

## Notes
- Each gap must land in `openapi.yaml` **before** its sprint's frontend task starts, with schemas reconciled against `docs/data-model.md`. Contract changes go through the planner (steering rule 1).
- Sensitive endpoints (`reveal`, compensation, payslips, audit-with-sensitive) must specify masking + the required permission + that access is audited (ADR-006).
- Money/statutory endpoints are `needs-expert` (steering rule 5); the UI only consumes their outputs.
- **FE alignment:** the demo uses tenant status `active|trial|suspended|provisioning`; the backend adopts the full ADR-008 set which adds `inactive` (offboarded). The frontend must add `inactive` handling (filter, badge, copy) when switching the platform console off demo mode.
