# Backend Implementation Roadmap — HRMS SaaS

Status: Proposed (planner, post-contract-review). Sequences backend delivery against the approved contract (`openapi.yaml`), ADRs, the existing demo frontend (which switches each module from demo→live as its API lands), and `tasks/backlog.json`. Steering hand-off order per sprint: **planner → backend + frontend + devops/compliance → qa + performance → security-reviewer**. Agents never merge to `main`; one `sprint/<N>` integration branch per sprint; human gates as marked.

Dependency principle (brief §9 adjusted to this project): **the platform plane and tenant foundation must exist before tenant modules**, because the tenant resolver reads `tenants.status` (ADR-008) and because tenancy/auth/RBAC underpin everything. Backend sprints below are relabelled B1…B10 to avoid confusion with the product backlog's S-numbers, with the mapping shown.

## B1 — Platform + Tenant foundation (maps to backlog S1 + new platform scope)
Goal: both planes exist; a tenant can be provisioned and resolved; cross-tenant read is impossible on the tenant plane.
- **Backend:** repo scaffold (present); `TenantConnectionResolver` + subdomain middleware **+ reserved/base-host handling** (ADR-001 amendment: base host carries no tenant, `/platform/*` is the platform plane on the same domain); `BelongsToTenant` trait + global scope; `tenants` extensions (ADR-008); platform plane bootstrap (separate guard, **token audience `platform`**, `/platform/*` routing on the same base domain — **no admin host**); `platform_users` + **fixed role enum** map via `PlatformAuthorizer` (DATA_MODEL_CHANGES #6); `PlatformAuditLogStore` → **separate `platform_audit_logs` collection** (decision 5).
- **Database:** `tenants` extend; `plans`, `subscriptions` (record-keeping fields incl. `billing_metadata`), `tenant_onboarding`, `platform_users`, `platform_access_sessions`; Mongo `platform_audit_logs`; indexes per DATA_MODEL_CHANGES. **No `platform_roles` tables.**
- **Frontend integration:** switch platform auth + tenants + onboarding + summary services demo→live; reconcile platform role labels → fixed enum; keep tenant modules on demo.
- **DevOps:** docker-compose; CI (lint/test/build + **openapi→types drift check**); **same-domain routing** (base host + wildcard `*.app.example.com`; reserved-label handling) — Terraform `plan` only. **No separate admin hostname.**
- **QA:** cross-tenant isolation harness; **token-audience isolation** test (tenant token rejected by `/platform/*` and vice versa); **base/reserved-host carries no tenant** test; lifecycle state-machine tests.
- **Security (SEC-1 gate):** tenancy global scope **and** plane separation (audience + namespace + identity; boundary is server-side, not URL/host); reserved-host fail-closed.
- **Dependencies:** none. **Acceptance:** subdomain resolves a tenant; base host serves platform login with no tenant; `suspended/provisioning/inactive` blocks login; platform token rejected by tenant endpoints and vice versa; provision→activate→tenant-admin-login works end to end; CI green.

## B2 — Authentication + MFA (both planes) (backlog S2-01/02)
- **Backend:** tenant Sanctum login/logout/refresh/me; password forgot/reset; invited-user `/auth/activate`; TOTP `/auth/mfa/setup|confirm|verify`; platform login + MFA. **MFA mandatory on BOTH planes** (approved decision 1).
- **DB:** `mfa_credentials` (🔒 secret/recovery codes), password-reset tokens.
- **FE integration:** login/MFA/forgot/reset/activate screens → live (built); separate `/platform/login` and `/login` experiences (built).
- **QA:** auth + cross-tenant + **MFA-mandatory-both-planes** tests; a tenant user cannot authenticate at `/platform/login`; a platform user is not a tenant user. **Security (SEC-2):** auth review, both-plane MFA enforcement, brute-force/rate-limit on both login endpoints.
- **Dependencies:** B1. **Acceptance:** login+MFA both planes; reset/activate work; separate-login invariants proven.

## B3 — RBAC (tenant) + platform authorization + read-only access session (backlog S2-03)
- **Backend:** tenant `roles`/`permissions`/policies + permission matrix catalog (`GET /permissions`); user management (`/users`, invite, activate/deactivate, sessions, login-history); role↔user assignment; **`PlatformAuthorizer`** finalizing the fixed `platform.*` enum map; **read-only platform access session** (`POST/DELETE /platform/tenants/{id}/access-sessions`) minting a scoped read-only tenant-context token (≤15 min, reason required) with double-audit.
- **DB:** `roles`, `permissions`, `role_permissions`, `user_roles`; `platform_access_sessions`.
- **FE integration:** roles + permission matrix + user management → live; reconcile "View tenant" → read-only access session.
- **QA:** permission enforcement + least-privilege; **access-session is read-only** (no tenant write succeeds), TTL expiry, double-audit entries present; effective-permissions. **Security (SEC-3):** RBAC, platform↔tenant permission disjointness, **access-session read-only + no privilege escalation + no `platform.*` inside tenant** — mandatory gate.
- **Dependencies:** B2. **Acceptance:** role-gated endpoints verified; matrix slugs match catalog; platform vs tenant catalogs provably disjoint; read-only access session cannot write and auto-expires at 15 min.

## B4 — Organization + employee master (backlog S3)
- **Backend:** org CRUD (companies/locations/departments/designations/grades), hierarchy + reporting-tree, holidays, work calendars; employee CRUD + custom fields + extensions; lifecycle (transfer/promote/manager-change/exit/reactivate); onboarding orchestration; sensitive **reveal + audit** (ADR-006).
- **DB:** org tables, employee extensions, `custom_field_definitions`/values; composite `(tenant_id, …)` indexes; PAN blind index.
- **FE integration:** organization + employees + onboarding → live.
- **QA:** composite-index + **N+1** checks (S3-04); cross-tenant on every new table (mandatory). **Security:** PII field-encryption + reveal-audit review. **Performance:** list p95 check.
- **Dependencies:** B3. **Acceptance:** employee create/list/edit with custom fields; masked PAN/bank; reveal audited; no N+1; isolation green.

## B5 — Audit, workflow, notifications (backlog S4)
- **Backend:** `AuditLogStore` (Mongo) tenant audit facade `GET /audit`; workflow engine (definitions, approvals act, instances, delegation); notifications (email + in-app) + preferences; self-service change-request.
- **DB:** `workflow_*` tables; Mongo `audit_logs`.
- **FE integration:** audit viewer, approvals inbox, notifications → live. **QA:** workflow + audit tests. **Security:** PII encryption review (S4-06).
- **Dependencies:** B4. **Acceptance:** employee changes audited; sample approval end-to-end; change-request via workflow.

## B6 — Documents + bulk import + self-service (backlog S5)
- **Backend:** presigned upload (MinIO/S3), document CRUD/categories/verify, bulk upload (queued), employee CSV import (queued), generic `GET /jobs/{id}`.
- **FE integration:** documents, self-service profile, bulk upload → live. **QA:** documents/self-service/import; sensitive-doc access audited. **Security:** document access flow + presigned expiry.
- **Dependencies:** B5 (workflow for change requests). **Acceptance:** upload/download; CSV import on queue; self-service change approved via workflow.

## B7 — Attendance (backlog S9–S10) [P2]
- **Backend:** shifts/rosters/policies; check-in/out + geo-fence; punch ingestion → SQS; `PunchStore` (Mongo); biometric push; regularization via workflow; attendance reports.
- **FE integration:** attendance + my-attendance + regularization → live. **QA:** attendance incl. geo-fence; isolation. **Performance:** punch ingestion load (ADR-004). **DevOps:** SQS + staging.
- **Dependencies:** B5 (workflow), B6 (jobs). **Acceptance:** check-in/out; punches via SQS; shifts/rosters; regularization approved via workflow.

## B8 — Leave (backlog S7–S8) [P2]
- **Backend:** leave types/policies, accrual engine, balances; apply/approve via workflow; team/holiday calendars; state-wise rules (config).
- **FE integration:** leave config + apply + approvals + calendars → live. **QA:** leave incl. state-wise rules; isolation. **Security:** leave module review.
- **Dependencies:** B5 (workflow), B4 (calendars/holidays). **Acceptance:** apply→approve→balance updates; accrual runs on queue.

## B9 — Workflows hardening + reporting + settings
- **Backend:** workflow builder/conditions/escalation/delegation completion; reporting (standard/saved/scheduled/export queued); settings (tenant/company/localization/security/retention/custom-fields); dashboard summary; global search (tenant+permission scoped).
- **FE integration:** reports, settings, dashboard summary, search → live. **QA:** export permission + sensitive-export gating; search isolation. **Security:** search tenant-isolation review; retention/DPDP settings.
- **Dependencies:** B5, B6. **Acceptance:** scheduled report delivered; search never returns out-of-scope results.

## B10+ — Payroll + Compliance (backlog S11–S16) [P3, needs-expert]
- **Backend:** salary components/structures, compensation (🔒); payroll run engine (gross/LOP/net) with Step Functions fan-out (ADR-005); PF/ESI/PT/TDS (expert-verified), ECR/Form 24Q/16; payslip PDF (Lambda); expense/loans/F&F.
- **FE integration:** payroll run stepper, payslips, compliance config, tax declaration → live. 
- **Compliance-Payroll:** statutory specs + rule drafts; **expert verification gates** on all money logic. **QA:** golden test cases (expert); statutory suite. **Security:** salary encryption review (S12-05). **Performance:** payroll run perf (S15-05).
- **Dependencies:** B3 (RBAC), B4 (employees), B5 (workflow for payroll approval), B8 (leave/LOP), B7 (attendance/LOP). **Acceptance:** calc matches expert golden cases; run stages (validate→…→publish) enforced; all payroll PRs `needs-expert`.

## Human gates (per steering)
- Each backend task: "You review diff". Each security/performance review: "You read report". Each infra apply: "You review and apply". All payroll/compliance logic: "Expert verifies". Contract changes (new gaps → openapi): planner, "You review".

## Verification baseline every sprint
Code + tests pass locally; contract updated if needed and types regenerated (drift check); no secrets; cross-tenant isolation test for any new tenant table/endpoint; `docs/notes/<task-id>.md` note. Payroll/compliance additionally expert-verified.
