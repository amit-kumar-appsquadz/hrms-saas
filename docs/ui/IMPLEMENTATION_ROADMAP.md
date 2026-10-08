# Implementation Roadmap — HRMS SaaS Frontend

Status: For review (planner). Maps UI modules to the existing backlog (`tasks/backlog.json`). The frontend is implemented by the Frontend agent against `openapi.yaml`; each sprint's frontend task must have its contract gaps (API_GAPS.md) added by the planner **first**. Hand-off order per sprint (steering): planner → backend + frontend (parallel) → qa + performance → security-reviewer.

Legend: **FE** frontend pages/components · **API** contract deps · **BE** backend dep · **FE-dep** prior frontend dep · **QA** · **SEC**.

## Phase 1 (P1) — Sprints 1–6

### Sprint 1 — Repo, local stack, CI, tenancy core
- **FE:** app scaffold, design-system/token foundation, shell skeleton (not role-complete), tenant-subdomain middleware wiring, four-states + DataTable/Form primitives. *(No user-facing pages yet; backlog has no FE task — treat as foundation set up alongside S1-01 scaffold.)*
- **API:** ✔ existing contract; set up generated-types pipeline.
- **BE:** S1-01..05 (scaffold, docker-compose, CI, tenant model, BelongsToTenant).
- **QA:** S1-06 isolation harness (FE must respect tenant context in cache keys).
- **SEC:** S1-07 tenancy review.

### Sprint 2 — Auth & RBAC
- **FE (S2-04):** `/login`, `/login/mfa`, `/forgot-password`, `/reset-password`, `/activate`, `/mfa/setup`; auth boundary + permission context from `/auth/me`; Admin/Roles + **permission matrix** (`/admin/roles*`).
- **API gaps first:** password forgot/reset, activate, mfa setup/confirm, `GET /permissions`, role↔user assignment, user mgmt endpoints.
- **BE:** S2-01 (Sanctum), S2-02 (MFA), S2-03 (RBAC).
- **FE-dep:** shell + permission context.
- **QA:** S2-05 auth + cross-tenant. **SEC:** S2-06 auth review.

### Sprint 3 — Org structure & employee master
- **FE (S3-03):** `/employees` list, `/employees/{id}` profile (tabs that exist now: Overview, Personal, Employment, Organization, Reporting, Contact, Statutory-masked, Custom fields, Audit-stub), create/edit multi-step form; Organization CRUD screens (companies/locations/departments/designations/grades), hierarchy views, holidays, calendars.
- **API gaps first (S3-05):** org CRUD, hierarchy, holidays/calendars, employee schema extensions, custom-field definitions, lifecycle actions, onboarding, sensitive-reveal+audit.
- **BE:** S3-01 (org entities), S3-02 (employee CRUD + custom fields).
- **QA:** S3-04 composite-index + N+1 (FE must request minimal projections — `EmployeeSummary` for lists).

### Sprint 4 — Audit, workflow, notifications
- **FE (S4-02):** `/audit` viewer (DataTable + diff), notification center + bell, `/approvals` inbox + approval UX contract, workflow instances view (builder may be stubbed/read-only this sprint).
- **API gaps first:** audit facade, workflow (definitions/approvals/instances/delegation), notifications, self-service change-request.
- **BE:** S4-01 audit writer, S4-03 workflow skeleton, S4-04 notifications.
- **QA:** S4-05 workflow+audit. **SEC:** S4-06 PII encryption review (FE: confirm no plaintext PAN/bank in client state).

### Sprint 5 — Documents, self-service, bulk import
- **FE (S5-02, S5-04):** employee documents UI (upload presigned, preview, verify), `/me/*` self-service profile + change request + my-documents, bulk-upload UI, employee CSV import UI with job-result report.
- **API gaps first:** documents (presign/confirm/verify/categories/bulk), self-service change-requests, import + generic `GET /jobs/{id}`.
- **BE:** S5-01 (presigned upload), S5-03 (self-service change req), S5-05 (CSV import queue).
- **QA:** S5-06 documents/self-service/import.

### Sprint 6 — Hardening & Phase 1 exit
- **FE:** polish, a11y pass, empty/error states audit, saved views + column visibility + dashboard layout (prefs API), rate-limit (`429`) UX, bug-fix buffer.
- **API gaps:** `/preferences`.
- **BE:** S6-04 rate limiting, S6-05 buffer. **QA:** S6-02 isolation suite. **PERF:** S6-01 k6 baseline (FE: ensure pagination/no mega-lists). **SEC:** S6-03 Phase-1 review. **planner:** S6-06 docs/runbook/demo.

## Phase 2 (P2) — Sprints 7–10

### Sprint 7 — Leave foundations
- **FE (S7-04):** `/leave/types`, `/leave/policies` config UI, leave dashboard shell.
- **API first:** leave-types, leave-policies, balances/accruals. **BE:** S7-01/02. **DEVOPS:** S7-03 staging plan (plan only).

### Sprint 8 — Leave requests & approvals
- **FE (S8-02):** `/me/leave/apply`, balances, leave calendar, `/leave/approvals` (reuses workflow approval UX), team calendar.
- **API first:** leave-requests, cancel, team/holiday calendar. **BE:** S8-01. **QA:** S8-03 (state-wise rules). **DEVOPS:** S8-04 staging deploy. **SEC:** S8-05.

### Sprint 9 — Attendance core
- **FE (S9-04):** `/me/attendance` + punch, `/attendance/daily|monthly`, shifts, rosters, dashboard.
- **API first:** punch/ingest/daily/monthly, shifts, rosters, policies. **BE:** S9-01/02/03. **QA:** S9-05.

### Sprint 10 — Attendance completion & pilot
- **FE (S10-04):** attendance reports UI, regularization queue (workflow), device/source views.
- **API first:** regularizations, attendance reports, devices. **BE:** S10-01/02/03. **PERF:** S10-05. **DEVOPS:** S10-06/07/08 (alarms, prod, runbook). **Milestone: first pilot customer.**

## Phase 3 (P3) — Sprints 11–16 (payroll/compliance; money logic `needs-expert`)

### Sprint 11 — Salary structure
- **FE (S11-02):** `/payroll/components`, `/payroll/structures` config UI, compensation (masked).
- **API first:** salary-components/structures, compensation. **BE:** S11-01. **compliance-payroll:** S11-03 statutory spec. **QA:** S11-05. **human:** S11-04 engage expert.

### Sprint 12 — Payroll engine core
- **FE:** payroll run shell + register (preview of Calculate→Review); no run-finalize UI yet.
- **API first:** payroll-runs create/validate/calculate/register. **BE:** S12-01. **DEVOPS:** S12-02 Step Functions. **QA:** S12-03 golden cases (expert). **SEC:** S12-05 salary encryption.

### Sprint 13 — PF/ESI/PT
- **FE:** `/compliance/pf|esi|pt` config + computed views, ECR export UI.
- **API first:** compliance pf/esi/pt, ECR. **BE:** S13-01/02/05 (expert-verified). **compliance-payroll:** S13-03. **QA:** S13-04.

### Sprint 14 — TDS & declarations
- **FE (S14-02):** `/me/tax` declaration + investment-proof upload, `/compliance/tds`.
- **API first:** tds, me/tax-declaration, proof verify. **BE:** S14-01 (expert). **compliance-payroll:** S14-03. **QA:** S14-04.

### Sprint 15 — Payslips, run UI, statutory reports
- **FE (S15-02):** `/payroll/runs/{id}` full stepper (Review→Approve→Lock→Generate→Publish), payslips (all + `/me/payslips`), `/compliance/reports` (24Q/16 drafts).
- **API first:** run stage actions, payslips, Form 24Q/16. **BE:** S15-01 (payslip PDF Lambda), S15-03. **QA:** S15-04. **PERF:** S15-05 run perf.

### Sprint 16 — Expense, loans, F&F
- **FE (S16-02):** expense claims UI; loans/advances + F&F surfaces.
- **API first:** expense-claims, loans, full-and-final. **BE:** S16-01/03/04. **human/expert:** S16-05 parallel run. **SEC:** S16-06 Phase-3 review.

## Dependency notes
- **Shared components built once (S1–S4) and reused everywhere:** DataTable, Form system, Stepper, ApprovalQueue/approval UX, Drawer/Modal, Upload/Preview, Charts, KPI cards, PermissionMatrix, DiffViewer.
- **Workflow approval UX (S4)** is a prerequisite for leave approvals (S8), regularization (S10), payroll approval (S15), and self-service change requests (S5).
- **Audit store/UI (S4)** backs every entity's audit panel in later sprints.
- **Generic jobs/notifications (S4/S5)** back every queued operation (import/export/bulk/payroll/report).
- Each sprint's **contract gaps must be merged into `openapi.yaml` before** that sprint's frontend task starts (steering rule 1); the planner owns this.
