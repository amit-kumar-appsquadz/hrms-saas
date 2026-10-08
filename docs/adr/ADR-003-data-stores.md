# ADR-003: Data stores

Status: Accepted (decision made by product owner); expanded by planner in Sprint 0.

## Decision
- MySQL (RDS Multi-AZ + RDS Proxy): transactional HR data.
- **MongoDB Atlas on AWS ap-south-1 (Mumbai), connected via PrivateLink**: audit logs and attendance punch events.
- Redis (ElastiCache): cache, sessions, rate limits. S3: documents, payslips, exports.

## Consequences
- External vendor and extra bill; mitigated by keeping audit and punch writers behind an interface so the store can be replaced.
- Local dev uses a Mongo container in docker-compose; production uses Atlas.
- DPDP: confirm Atlas cluster region is ap-south-1 and that backups stay in India.

## Alternatives considered
DynamoDB (punches) + S3/Athena (audit archive): AWS-native, but needs access patterns designed up front. Not chosen.

## Store abstraction (planner expansion, Sprint 0)
Audit and punch writes/reads go through interfaces so Mongo stays replaceable (steering + original decision):
- `AuditLogStore` — `append(event)`, `query(tenant_id, filters, pagination)`.
- `PunchStore` — `record(punch)`, `queryRange(tenant_id, employee_id, from, to)`.
MySQL remains the system of record for transactional entities; Mongo holds append-mostly, high-volume event data only. No cross-store transactions — writes to Mongo are driven by domain events (ADR-004), not two-phase commits.

## Atlas tier / sizing assumptions (to confirm with human)
- Phase 1 pilot: **M10 or M20** dedicated cluster, 3-node replica set, ap-south-1 only. Start small; scale tier up as punch volume grows.
- Punch volume estimate (mid-market): a 2,000-employee tenant at ~2-4 punches/day ≈ 4k-8k docs/day/tenant; sizing is driven by total active tenants, revisit before pilot.
- Backups: Atlas continuous/cloud backups pinned to an **India region**; verify no cross-border backup copy (DPDP).

## Index strategy
- **Punches** (`punches` collection): compound index `{ tenant_id: 1, employee_id: 1, punched_at: -1 }` to serve per-employee range queries; secondary `{ tenant_id: 1, punched_at: -1 }` for tenant-wide reports. `tenant_id` leads every index (mirrors the relational tenancy rule in ADR-001).
- **Audit** (`audit_logs` collection): compound index `{ tenant_id: 1, occurred_at: -1 }` and `{ tenant_id: 1, entity_type: 1, entity_id: 1, occurred_at: -1 }` for per-entity history.
- Every Mongo query is tenant-scoped in the store implementation; a missing `tenant_id` filter is a leak and is covered by isolation tests.

## Retention policy (proposed; confirm with compliance)
- **Punches:** retain raw punches 24 months hot in Atlas, then archive to S3 (Parquet/JSON) and purge from Atlas. Derived attendance summaries live in MySQL.
- **Audit logs:** retain 7 years (payroll/statutory expectation) — hot in Atlas for ~12 months, then S3 archive in the `security/log-archive` account (ADR-002). Audit is append-only; no updates/deletes except policy-driven archival.
- DPDP erasure: audit entries are retained for legal/statutory reasons where applicable; erasure requests reconcile against retention obligations (see ADR-006).

## PrivateLink setup notes (human applies)
- Create an AWS PrivateLink endpoint from each workload VPC (dev/staging/prod) to the Atlas cluster; no public internet path.
- Atlas IP access list restricted to the PrivateLink endpoint; database users scoped per environment with least privilege.
- Connection string + credentials stored in Secrets Manager (never committed). Local dev uses the docker-compose Mongo container, so no cloud calls in tests (steering).

## Open questions
- Final Atlas tier and whether a single cluster is shared across tenants (with tenant_id scoping) vs per-environment clusters — assume shared-per-environment for Phase 1; confirm.
- Confirmed retention periods for punches and audit with the compliance/payroll expert (statutory minimums).
- Does Atlas's India-region DR satisfy ADR-002's RPO target?
