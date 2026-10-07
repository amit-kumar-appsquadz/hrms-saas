# HRMS SaaS Platform - Project Rules (read first, every task)

Multi-tenant HRMS for India, built on AWS (ap-south-1, DR ap-south-2). Zoho-People-class scope, delivered in phases.

## Stack
- Backend: Laravel (Octane) modular monolith. Frontend: Next.js.
- MySQL (RDS) for transactional data. MongoDB Atlas (decided, ADR-003) for audit logs and attendance punches, behind an interface.
- Redis, SQS (queues per workload + DLQ), S3, Lambda for event glue, Step Functions for payroll runs.
- Local dev: docker-compose (MySQL, Mongo, Redis, MinIO). No cloud calls in tests.

## Non-negotiable rules
1. **Contract first.** `openapi.yaml` is the source of truth. Backend and frontend both work from it. Contract changes go through the planner.
2. **Tenancy.** Every tenant table has `tenant_id`; composite indexes start with `tenant_id`; use the `BelongsToTenant` global scope. Cache keys are tenant-prefixed. Any query that bypasses the scope needs a comment explaining why and a test.
3. **Latency.** Target p95 < 200 ms, p99 < 500 ms. Paginate every list. No N+1 queries. Work over ~300 ms goes to a queue.
4. **Security.** Never commit secrets. PAN/bank/salary fields are encrypted at field level. Never store full Aadhaar numbers. Follow DPDP: consent, access/erasure, breach process.
5. **Money and statutory logic** (payroll, PF, ESI, PT, TDS) is drafted by agents but must be verified by a human expert. Mark such PRs `needs-expert`.
6. **Infrastructure:** agents write Terraform and run `terraform plan` only. Never `apply`, never run AWS mutating commands. A human applies.
7. **Tests:** every task ships with tests. Cross-tenant isolation tests are mandatory for any new tenant table or endpoint.
8. **Git:** work only on your assigned branch/worktree. Small commits with the task ID in the message (e.g. `S1-04: tenant resolution middleware`). Never force-push; never touch `main`.

## Team and hand-offs
Order within a sprint: planner -> backend + frontend (parallel) + devops/compliance-payroll -> qa + performance -> security-reviewer.
- planner: ADRs, openapi.yaml, data model, docs. Writes no application code.
- backend / frontend: implement against the contract.
- qa: tests only; reports bugs rather than silently fixing product code, unless the fix is trivial.
- security-reviewer and performance: read-only reviews; write findings to `docs/reviews/<task-id>.md`.
- devops: Terraform/CI. Active from Sprint 7.
- compliance-payroll: statutory specs and logic drafts. Active from Sprint 11.

## Definition of done
Code + tests pass locally, contract updated if needed, no secrets, task ID in commits, a short note in `docs/notes/<task-id>.md` (what changed, risks, how to verify).

## Human gates
The backlog marks tasks with a human gate ("You review diff", "Expert verifies", "You review and apply"). The orchestrator opens one PR per sprint listing these; a human merges. Agents never merge to `main`.
