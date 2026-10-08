# Workflow / Approvals Module — HRMS SaaS

Status: For review (planner). Sprint anchor: S4 (approval workflow engine skeleton + a sample flow end-to-end). Generic engine reused by leave, attendance regularization, employee changes, salary changes, onboarding, exit, payroll approval. Data model: `workflow_definitions`, `workflow_instances`, `workflow_steps`. All APIs are **gaps**.

## 1. Workflow definitions / builder (`/workflows/definitions`, `/workflows/builder/{id}`) — HR/Admin
- List: name, trigger type (leave/regularization/employee-change/salary-change/onboarding/exit/payroll-approval), active, # instances, version.
- **Builder:** visual, step-based.
  - Trigger: which event/entity starts it.
  - **Approval levels:** ordered steps; per step choose approver resolution — specific user, role, reporting manager (L1/L2 via reporting hierarchy), department head, dynamic (field-based).
  - **Conditions:** branch/skip rules on entity data (e.g. amount > X → add finance approver; leave > N days → extra level).
  - Parallel vs sequential steps; all-must-approve vs any-one.
  - **Escalation:** auto-escalate after SLA (hours/days) to next approver/manager.
  - **Delegation:** approvers can delegate during absence.
  - Notifications per step (email/in-app).
- Versioned + effective-dated; editing a definition doesn't alter in-flight instances. Permissions: `workflow.definition.manage`.
- States: empty ("No workflows — create or use defaults"), loading, error. Builder: dirty-guard, validation (no orphan steps, resolvable approvers).

## 2. Pending approvals (`/approvals`, shell badge) — any approver
- Unified inbox across all workflow types for the current user. Columns: type, subject (requester + what), submitted, SLA/age, current step, actions.
- Filters by type/age/priority; bulk approve (same-type); saved views.
- Actions: **approve / reject / request changes** (comment required for reject/changes); view full subject context in a drawer (e.g. the leave request, the comp change diff) without leaving the queue.
- Deep-links from notifications and module screens land here or on the subject.

## 3. Workflow instances (`/workflows/instances`, `/workflows/instances/{id}`) — HR/Admin
- List all running/completed instances with status (pending/approved/rejected/cancelled/escalated), type, subject, initiator, current step, age.
- Instance detail: **timeline** of steps (approver, decision, comment, timestamp), current step, subject snapshot (before/after for change requests), escalation/delegation events, cancel action (privileged).

## 4. Approval history
- Per-subject (e.g. an employee's change history) and per-user (what I approved). Immutable, audited (ADR-003).

## 5. Delegation (`/workflows/delegation`, self-service)
- A user sets a delegate for a date range (vacation cover): all/selected workflow types routed to the delegate; auto-revert after end date. Audited.

## 6. Reusable approval UX contract (used by all modules)
- Any module submitting for approval creates a workflow instance and shows the request's status inline ("Pending L1 — Manager").
- Approve/reject/request-changes controls, comment capture, and the status timeline are shared components so leave, regularization, comp change, onboarding, exit, and payroll approval all behave identically.
- Request-changes returns the subject to the initiator in an editable state; resubmit restarts/continues the chain per definition.

## Permissions
`workflow.definition.manage`, `workflow.instance.view`, `workflow.instance.cancel`, `approval.act` (approve/reject/request-changes on assigned steps), `delegation.manage`. Approver resolution is dynamic — a user sees only steps assigned to them (or their role/management line).

## States / responsive
- Four-states everywhere; approvals inbox is mobile-first (managers approve on the go); the builder is desktop-only (complex canvas) with a read-only mobile view.
