# ADR-002: AWS topology and accounts

Status: Accepted (Sprint 0). Agents plan only; a human creates the Organization and applies all infrastructure.

## Context
Mid-market HRMS SaaS hosted on AWS, India data residency (DPDP). We need an account structure that separates blast radius, keeps a tamper-resistant log/audit account, and supports a dev -> staging -> production promotion path, with disaster recovery in a second Indian region.

## Decision
- **Primary region:** ap-south-1 (Mumbai). **DR region:** ap-south-2 (Hyderabad).
- **DR posture (Phase 1): pilot-light.** Core data is replicated to ap-south-2 (RDS cross-region replica/snapshots, S3 cross-region replication, Mongo Atlas handled by the vendor); compute (ECS services) stays scaled to zero/minimal in DR and is scaled up on failover. Accepts a higher RTO in exchange for low standing cost; revisit for warm-standby before large-scale GA.
- **AWS Organization with these accounts:**
  - `management` — Organization root, consolidated billing, SCPs. No workloads.
  - `security/log-archive` — centralized CloudTrail, Config, GuardDuty findings, immutable log/audit archive. Write-mostly; tightly restricted.
  - `shared-services` — CI/CD runners, ECR, shared tooling, DNS, parameter/secrets baseline.
  - `dev` — development environment.
  - `staging` — pre-production, mirrors prod topology at smaller scale.
  - `production` — live customer workloads; most restricted human access.
- **Network:** one VPC per environment account, private subnets for app/data tiers, public subnets only for ALB/NAT. MongoDB Atlas reached via PrivateLink (per ADR-003). No database publicly exposed.
- **Compute:** ECS (Fargate) behind an ALB for the Laravel Octane app and Next.js frontend (confirmed in staging Terraform, S7-03). Lambda for event glue and payslip PDF generation. Step Functions for payroll runs (ADR-005).
- **Guardrails:** SCPs deny actions outside ap-south-1/ap-south-2 (except global services), deny disabling CloudTrail/Config, and deny root usage in workload accounts. Agents never run the AWS CLI or `terraform apply` (steering rule 6); Terraform `plan` only, human applies.

## Consequences
- Clear blast-radius separation and an auditable log account support DPDP breach/forensics requirements.
- Six accounts add IAM/billing setup overhead; acceptable for a platform expected to carry regulated payroll data.
- Pilot-light DR means a real RTO/RPO target must be written down and a restore test performed (S10-08) before the first pilot; failover is a documented, partly manual runbook in Phase 1.
- Region-pinning SCPs reduce accidental data egress from India.

## Alternatives considered
- **Single account, multiple VPCs:** cheaper and simpler, but weak blast-radius isolation and no clean separation of the audit/log plane. Not chosen for a payroll platform.
- **Warm standby DR in Phase 1:** lower RTO, but roughly doubles standing compute cost before there is pilot revenue. Deferred; pilot-light now, revisit at GA.
- **Multi-region active-active:** unnecessary complexity and cost at this stage; data-residency and consistency overhead not justified pre-GA.

## Assumptions
- ap-south-2 has the services we need (RDS, ECS/Fargate, S3, Lambda, Step Functions, PrivateLink to Atlas) at Phase-1 scope; the human validates availability during S0-09.
- Consolidated billing in `management` is acceptable; no reseller/marketplace billing split in Phase 1.

## Open questions
- Confirmed RTO/RPO targets for Phase 1 pilot (drives how "pilot-light" is tuned)?
- Identity: AWS IAM Identity Center (SSO) for human access across accounts — in scope for Sprint 0/1 or deferred?
- Does Atlas DR/region replication within India satisfy the same RPO as our RDS/S3 plan? (coordinate with ADR-003)
