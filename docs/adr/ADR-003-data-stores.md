# ADR-003: Data stores

Status: Accepted (decision made by product owner); planner to expand in Sprint 0.

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

## Planner to-do (Sprint 0)
Add: Atlas tier/sizing assumptions, index strategy for punches (tenant_id, employee_id, punched_at), retention policy, and PrivateLink setup notes (human applies).
