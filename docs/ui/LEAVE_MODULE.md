# Leave Module — HRMS SaaS

Status: For review (planner). Sprint anchor: S7 (types, policies, accrual engine, holiday calendars, leave policy UI), S8 (apply, approve via workflow, leave UI). All APIs are **gaps**. State-wise leave rules exist (backlog S8-03) — rules are config/backend-driven, the UI never hardcodes legal entitlements.

## 1. Leave dashboard (`/leave`)
- Employee view: my balances by type (donut/bars), pending requests, upcoming approved leave, team-out-today, holidays this month.
- HR/Manager view: pending approvals count, who's on leave today, balance exceptions, accrual run status.
- States: loading skeletons; empty (leave not configured → link to leave types/policies); error.

## 2. Leave types (`/leave/types`) — HR/Admin
- Define types: name, code, paid/unpaid, accrual-based vs fixed, unit (day/half-day/hour), gender/eligibility constraints, requires-attachment (e.g. medical), encashable, color.
- CRUD + archive; config-driven. Permissions: `leave.type.manage`.

## 3. Leave policies (`/leave/policies`) — HR/Admin (S7)
- Policy = rules bound to leave types for a group (company/location/grade/employee-set):
  - **Accrual:** frequency (monthly/quarterly/annual), rate, pro-rata on join/exit, waiting period, max accrual cap.
  - **Carry-forward:** allowed, cap, expiry/lapse rules.
  - **Encashment:** eligibility, cap.
  - **Negative balance / advance leave:** allowed, limit.
  - **Approval chain:** levels/approvers (routes through workflow engine).
- Config-driven forms with preview of effective rules. Permissions: `leave.policy.manage`.

## 4. Leave balances (`/leave/balances`)
- HR: table of employees × leave type → opening/accrued/used/pending/available/carry-forward. Filters, export, manual adjustment (permission-gated + audited).
- Employee: own balances on self-service.
- Accrual run: trigger/preview accrual (queued job), history, exceptions.

## 5. Apply leave (`/me/leave/apply`) — Employee
- Form: type (shows balance), from/to (half-day start/end options), unit, reason, attachment (if required), contact-during-leave, auto-computed working days (excludes holidays/week-offs via work calendar).
- Live balance check + warning on insufficient/negative. Overlap detection. Submit → workflow instance.
- Draft + dirty-guard. `422` field errors.

## 6. Approve / reject (`/leave/approvals`) — Manager/HR
- Approval queue (shared with Workflows "Pending approvals"): requester, type, dates, days, balance-after, reason, attachments.
- Actions: approve / reject / request-changes (comment required on reject/changes). Bulk approve. Delegation/escalation per workflow.
- Team-coverage context (who else is out) shown before approving.

## 7. Cancellation
- Employee cancels pending or future-approved leave (policy-dependent); past/approved cancellation may need HR approval → workflow. Balance reversal handled server-side; UI reflects after confirmation.

## 8. Leave history (`/me/leave`, `/leave/history`)
- Chronological requests with status, approver, timestamps, comments; filter by type/status/date; export.

## 9. Team leave calendar (`/leave/team-calendar`) — Manager/HR
- Calendar/timeline of team members' leaves + holidays + week-offs; month/week views; filter by department/location; conflict/coverage heatmap.

## 10. Holiday calendar (`/leave/holidays`)
- Consumes Organization → Holidays (location/calendar/year). Employee sees applicable holidays; HR manages via Org module.

## Role capability summary
| Capability | EMP | MGR | HRM | HRA | TA |
|---|:--:|:--:|:--:|:--:|:--:|
| Apply / cancel own leave | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own balance/history | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve team leave | – | ✓ | ✓ | ✓ | ✓ |
| Team calendar | – | ✓ | ✓ | ✓ | ✓ |
| Manage types/policies | – | – | ✓ | ✓ | ✓ |
| Adjust balances / run accrual | – | – | scope | ✓ | ✓ |

Permissions: `leave.apply`, `leave.cancel`, `leave.view.self/team/all`, `leave.approve`, `leave.type.manage`, `leave.policy.manage`, `leave.balance.adjust`, `leave.accrual.run`, `leave.report`.

States/responsive: paginated lists + four-states; mobile-first for apply/approve/balance; policy config desktop-first. All actions audited (ADR-003).
