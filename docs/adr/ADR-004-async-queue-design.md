# ADR-004: Async and queue design

Status: Accepted (Sprint 0).

## Context
Latency targets are p95 < 200 ms, p99 < 500 ms, and any unit of work expected to exceed ~300 ms should run asynchronously (steering rule 3). We need a consistent queue model that isolates workloads, handles failures without data loss, and keeps tenant context across async boundaries.

## Decision
- **AWS SQS, one queue per workload**, each with a dedicated dead-letter queue (DLQ). Initial queues: `imports` (bulk CSV employee import), `notifications` (email/SMS), `documents` (post-upload processing), `punch-ingest` (attendance punches -> PunchStore), `audit` (audit log writes), `payroll` (payroll-run steps, invoked via Step Functions — ADR-005). Add queues per new heavy workload rather than overloading one.
- **DLQ + redrive on every queue.** `maxReceiveCount` threshold routes poison messages to the DLQ; DLQs are alarmed (CloudWatch, S10-06) and support manual/redrive replay.
- **Lambda for event glue** where the work is small, event-shaped, and infra-adjacent (e.g. S3 object-created -> enqueue document processing, EventBridge schedule -> enqueue accrual jobs). Heavier domain work runs in Laravel queue workers on ECS consuming SQS.
- **Tenant context in every message.** Each message payload carries `tenant_id` (and correlation/trace id). Workers set the tenant context before any DB access so the `BelongsToTenant` scope (ADR-001) applies; a message without `tenant_id` is rejected to the DLQ.
- **Idempotency.** Consumers are idempotent (idempotency key or natural dedupe) so SQS at-least-once delivery and redrives do not double-apply effects. FIFO queues used only where strict ordering is required (evaluate per workload; default is standard queues).
- **Thresholds.** Request handlers stay synchronous only when confidently under ~300 ms. Bulk/import, PDF generation, notifications, punch fan-out, and payroll are always async.

## Consequences
- Clear workload isolation: a notification backlog cannot stall imports or punches.
- At-least-once + idempotency pushes complexity into consumers but avoids lost or double-processed work.
- DLQ alarms give an operational signal for stuck workloads; a redrive runbook is needed (devops, Phase 2).
- Local dev uses SQS-compatible behavior via Laravel queues on Redis/SQS driver; no cloud calls in tests (steering) — tests assert jobs are dispatched/handled, not that AWS was called.

## Alternatives considered
- **Single shared queue with a type field:** simplest, but one noisy workload degrades all; no per-workload scaling or DLQ semantics. Not chosen.
- **EventBridge as the primary bus:** great for fan-out/event routing, heavier than needed for straightforward work queues; used selectively for scheduling/glue, not as the main work transport.
- **Redis-only queues in production:** fine for local dev, but SQS gives managed durability, DLQs, and scaling that match the AWS target. Redis stays for cache/session/rate-limit (ADR-003).

## Assumptions
- Standard (not FIFO) queues are acceptable for most workloads; punch and payroll ordering handled by data design/idempotency rather than queue ordering unless a specific case proves otherwise.
- Queue infrastructure is defined in Terraform (devops, from Sprint 7) and applied by a human.

## Open questions
- Which workloads, if any, genuinely require FIFO ordering (candidate: payroll step sequencing — but Step Functions already orders those)?
- Retry/backoff policy and `maxReceiveCount` per queue — set defaults now or defer to devops in Sprint 7?
