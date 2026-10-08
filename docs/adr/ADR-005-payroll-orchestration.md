# ADR-005: Payroll orchestration (Step Functions)

Status: Accepted (Sprint 0) for the orchestration shape only. All statutory/money calculation logic is drafted later and MUST be verified by a human/domain expert (steering rule 5). This ADR invents no payroll math.

## Context
A payroll run processes every active employee of a tenant for a pay period: compute gross, loss-of-pay, statutory deductions (PF, ESI, PT, TDS), and net, then produce payslips and statutory outputs. This is long-running, fan-out-heavy, must be restartable/auditable, and must separate orchestration from the calculation rules so the rules can be verified independently by an expert.

## Decision
- **AWS Step Functions orchestrates a payroll run; it does not compute payroll.** The state machine coordinates stages and fan-out; each employee's calculation is performed by a worker that calls a dedicated, separately-testable calculation module.
- **Clean separation of concerns:**
  - *Orchestration* (this ADR): run lifecycle, fan-out, retries, aggregation, locking, status.
  - *Calculation rules* (later sprints, `needs-expert`): gross/LOP/net (S12), PF/ESI/PT (S13), TDS (S14). These live behind a `PayrollCalculator` interface so orchestration depends on the interface, not on specific statutory formulas.
- **High-level state machine (shape, not final):**
  1. `PreparePayrollRun` — snapshot inputs for the period (salary structures, attendance/LOP, declarations); mark run `processing` and locked for edits.
  2. `FanOutEmployees` — Map state over employees (batched); each branch invokes the calculator worker. Bounded concurrency to respect DB/latency limits.
  3. `AggregateResults` — collect per-employee results, totals, and errors.
  4. `GenerateOutputs` — payslip PDFs (Lambda, S15-01), ECR/statutory exports (S13-05, S15-03) — enqueued via SQS (ADR-004).
  5. `ReviewGate` — run stays in `preview`; a human approves/locks via the payroll run UI (S15-02) before anything is treated as final.
- **Idempotent and restartable.** A run has a unique id; stages are idempotent so a failed run can be retried without double-paying. Per-employee failures are captured and reported, not silently dropped.
- **Audit + money trail.** Run lifecycle events and per-employee outcomes are written to the audit store (ADR-003). Salary/calculation outputs that are sensitive are field-encrypted (ADR-006).
- **PRs touching calculation logic are marked `needs-expert`** and gated on expert verification against golden test cases (S12-03, S13/S14).

## Consequences
- Orchestration can be built and tested (with stub/golden calculators) before statutory logic is finalized, de-risking the schedule.
- Step Functions gives visible run state, retries, and restartability suited to a process that must never double-pay.
- Fan-out concurrency must be bounded to protect the shared MySQL cluster and the latency budget for other tenants (ADR-001 noisy-neighbor).
- An explicit human review/lock gate prevents an un-verified run from being treated as final.

## Alternatives considered
- **Monolithic queue job per run:** simpler, but poor visibility, weak partial-failure handling, and hard restart semantics for a money-critical process. Not chosen.
- **Pure SQS fan-out without an orchestrator:** scales, but no first-class run state/aggregation/retry-at-the-run-level; reinventing Step Functions. Not chosen.
- **Synchronous in-request payroll:** impossible within the latency budget; violates the ~300 ms rule. Not chosen.

## Assumptions
- Payroll runs are per-tenant, per-pay-period; concurrency across tenants is allowed but bounded.
- Calculation modules are pure/deterministic given snapshot inputs, enabling golden-case testing (expert-owned).

## Open questions
- Step Functions Standard vs Express workflows (Standard assumed for auditability/duration) — confirm with devops in S12-02.
- Batch size / max concurrency for the Map fan-out against the shared cluster — tune with performance (S15-05).
- Where is the authoritative pay-period snapshot stored (MySQL snapshot tables vs immutable export)? Confirm with backend before S12.
