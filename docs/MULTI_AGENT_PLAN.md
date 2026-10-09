# Multi-Agent Coordination & Dependency Graph

Status: Proposed (planner). Task ownership and parallelization so agents don't edit the same areas. File-ownership boundaries follow the fixed repo layout (steering).

## Ownership boundaries (who writes where)
| Agent | Writes | Never writes |
|---|---|---|
| Planner | `openapi.yaml`, `docs/**` (adr, ui, roadmap), `tasks/backlog.json` | application code |
| Backend | `backend/**` (Laravel, migrations, API, policies) | `frontend/**`, `infra/**`, contract |
| Frontend | `frontend/**` (Next.js, service bodies demo→live) | `backend/**`, contract, infra |
| DevOps | `infra/**` (Terraform `plan` only), CI config | app code, contract |
| QA | `backend/tests/**`, `frontend/**/*.test.*`, `tests/load` fixtures | product code (reports bugs; trivial fixes only) |
| Security-reviewer | `docs/reviews/<task-id>.md` | code (read-only) |
| Performance | `docs/perf/**`, `tests/load/**` (k6) | product code |
| Compliance-Payroll | `docs/payroll/**`, statutory specs/drafts | final money logic (expert verifies) |

Contract is the integration seam: planner lands a gap in `openapi.yaml`, then backend (implements) and frontend (switches service demo→live) proceed **in parallel** against it without touching each other's trees.

## Concurrency vs dependency (per backend sprint)
```
B1 Foundation ─┬─ backend: tenancy + platform plane ─┐
               ├─ devops: compose + CI + same-domain routing (no admin host) ├─(parallel)
               └─ frontend: platform services → live  ┘
                        │ then QA(isolation+audience) → SECURITY GATE
B2 Auth/MFA ───┬─ backend auth ───┬ frontend auth screens live (parallel)
               └ depends: B1       └ then QA → SECURITY GATE (auth)
B3 RBAC ───────── depends: B2 ──── backend RBAC ∥ frontend matrix/users → QA → SEC GATE
B4 Org+Employee ─ depends: B3 ──── backend ∥ frontend ∥ (perf list check) → QA(N+1,iso) → SEC GATE (PII)
B5 Audit/WF/Notif depends: B4 ──── backend ∥ frontend → QA → SEC (PII)
B6 Docs/Import ── depends: B5 ──── backend ∥ frontend → QA → SEC (doc access)
B7 Attendance ── depends: B5,B6 ── backend ∥ frontend ∥ devops(SQS,staging) ∥ perf → QA → SEC
B8 Leave ──────── depends: B5,B4 ── backend ∥ frontend → QA → SEC
B9 Reports/Settings/Search depends: B5,B6 ── backend ∥ frontend → QA → SEC (search iso)
B10+ Payroll/Compliance depends: B3,B4,B5,B7,B8 ── backend ∥ frontend ∥ compliance-payroll ∥ perf
                        → QA(golden,expert) → EXPERT VERIFY → SEC GATE (salary enc)
```

### Can run concurrently
- Within a sprint: backend + frontend + devops + (compliance-payroll for P3) once the contract slice is landed by the planner.
- Across sprints: B7 (Attendance) and B8 (Leave) are **independent of each other** (both depend on B5/B4) → can run in parallel if staffed.
- Performance baselining and k6 fixtures can proceed alongside any module once endpoints exist.

### Hard sequential dependencies (cannot parallelize)
- B1 → B2 → B3 (tenancy → auth → RBAC) is a strict chain; everything else sits on top of B3.
- Workflow (B5) blocks leave approvals (B8), regularization (B7), payroll approval (B10+), and self-service change requests (B6).
- Audit store (B5) backs every later module's audit requirement.
- Platform plane (B1) blocks any tenant provisioning/resolution — so B1 precedes all tenant work.

## Security review gates (must pass before sprint merge)
| Gate | Sprint | Focus |
|---|---|---|
| SEC-1 | B1 | Tenancy global scope + **plane separation / token audience** (server-side, not URL/host) + reserved/base-host fail-closed |
| SEC-2 | B2 | Auth, **MFA mandatory both planes**, brute-force, separate-login invariants |
| SEC-3 | B3 | RBAC, platform↔tenant permission disjointness, **read-only access-session** (no writes, no escalation, ≤15 min, double-audited) |
| SEC-4 | B4 | PII field encryption + reveal-audit |
| SEC-5 | B5/B6 | Audit immutability (tenant `audit_logs` + separate `platform_audit_logs`), document access/presigned |
| SEC-6 | B9 | Global-search tenant isolation, retention/DPDP |
| SEC-7 | B10+ | Salary encryption; (write impersonation only if/when approved) |

## QA acceptance criteria (cross-cutting)
- Every new tenant table/endpoint ships a **cross-tenant isolation test** (steering rule 7) — non-negotiable.
- **Token-audience isolation** test from B1: platform token rejected by tenant endpoints and vice versa; tenant user cannot authenticate at `/platform/login`; platform user is not a tenant user.
- **Base/reserved host carries no tenant** (fail-closed) test.
- **Read-only access-session** tests (B3): no tenant write succeeds under the session token; TTL ≤15 min enforced; entries in both `platform_audit_logs` and tenant audit.
- Lifecycle state-machine tests (illegal transitions → `409`); resolver blocks `suspended/provisioning/inactive`; subdomain immutable + reserved-label rejected.
- Pagination/filter/sort + `Error`/`ValidationErrorBody` conformance on every list.
- Masked sensitive fields never return plaintext; reveal is audited.
- Payroll/compliance: golden cases match expert values before merge.
