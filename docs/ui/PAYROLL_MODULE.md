# Payroll Module — HRMS SaaS

Status: For review (planner). Sprint anchor: S11 (salary components/structures + UI), S12 (engine core: gross/LOP/net), S15 (payslip PDF, run UI preview/approve/lock, statutory reports), S16 (expense/loans/F&F). All APIs are **gaps**.

**Rule (steering 5):** the UI **displays and configures** payroll; it never invents statutory rates or calculation logic. All calculations, rates, and statutory outputs come from the backend and are **expert-verified**. Any PR touching money logic is `needs-expert`. Salary/compensation amounts are 🔒 field-encrypted (ADR-006) and permission-gated in the UI.

## 1. Payroll dashboard (`/payroll`) — Payroll Admin / Tenant Admin
- KPIs: current period status, employees in run, gross/net totals (permission-gated), exceptions, pending approvals, last run date.
- Period selector; run status timeline; quick links to active run.
- States: loading; empty (no salary structures / no run → setup CTA); error.

## 2. Payroll configuration (`/payroll/config`)
- Pay frequency, pay-period calendar, cut-off dates, LOP day-basis (calendar/working days — ties to work calendars), rounding rules, payment date. Config-driven; no hardcoded statutory values.

## 3. Salary components (`/payroll/components`) — S11
- Define components: name, code, type (earning/deduction/reimbursement/statutory), taxable flag, calculation basis (fixed/percentage-of/formula — formula evaluated server-side), prorate-on-LOP, show-on-payslip, statutory linkage (PF/ESI/PT/TDS tags → used by compliance engine).
- CRUD + archive; versioned (effective dates). Permissions: `payroll.component.manage`.

## 4. Salary structures (`/payroll/structures`) — S11
- Compose components into a structure/CTC template; assign to grades/employees. Shows gross/CTC breakup preview (computed server-side). Effective-dated.
- Permissions: `payroll.structure.manage`.

## 5. Employee compensation (`/payroll/compensation`) 🔒
- Per-employee assigned structure + component values; revision history (hikes/promotions); effective dates. Amounts masked unless `payroll.compensation.view`; edits audited and may require approval (comp-change workflow).

## 6. Payroll periods & runs (`/payroll/runs`, `/payroll/runs/{id}`) — S12/S15
Run detail is a **stepper** reflecting the mandated workflow:

```
Draft → Validate → Calculate → Review → Approve → Lock → Generate Payslips → Publish
```

| Stage | UI | Backend | Notes |
|---|---|---|---|
| Draft | Create run (period, scope: company/all/filtered employees) | create run | editable |
| Validate | Pre-flight checks: missing structures, LOP/attendance gaps, negative net, missing bank/PAN | validate job | blocking vs warning issues listed; must resolve blockers |
| Calculate | Trigger calculation (Step Functions fan-out, ADR-005); progress % | async run | long-running → progress + notification; UI never computes |
| Review | Register table: per-employee gross, deductions, statutory, LOP, net; drill-down to payslip preview; variance vs last month | read | exceptions highlighted; comment threads |
| Approve | Approver confirms (permission `payroll.approve`); captures approver + timestamp | approve | `needs-expert` gate for logic; audited |
| Lock | Freezes the run (no edits); irreversible-with-override | lock | typed confirmation; unlock is a separate privileged, audited action |
| Generate Payslips | PDF generation (Lambda, S15) per employee | async | progress; retry failed |
| Publish | Release payslips to employees + notify | publish | optional bank/payment export file generated here |

**Clearly distinguished stages:** calculation (compute) ≠ approval (sign-off) ≠ finalization/lock ≠ payment/export. Each is a separate permissioned action with its own audit entry.

## 7. Payroll review detail / exceptions (`/payroll/runs/{id}/review`, `/payroll/exceptions`)
- Register grid with filters (department/location/exception type); per-employee breakdown drawer; exception queue (missing data, anomalies, variance thresholds) with resolve/override (audited).

## 8. Payslips (`/payroll/payslips`, `/me/payslips`) 🔒
- HR/Payroll: searchable payslip list per run/employee; download/regenerate; bulk download (queued).
- Employee self-service: own payslips list + PDF view/download; year-to-date summary. Masked where applicable; access logged.

## 9. Payroll reports (`/payroll/reports`)
- Salary register, bank advice/transfer file, variance, cost-to-company, reimbursements, deductions summary. Export CSV/Excel/PDF (queued); sensitive exports require `payroll.export.sensitive`. Permission-gated.

## 10. Payroll history & audit (`/payroll/history`)
- Past runs with status, totals (gated), approver, lock/publish timestamps. Each run's audit trail (ADR-003): who calculated/approved/locked/overrode, before/after on edits.

## Role capability summary
| Capability | PA | TA | HRA | MGR | EMP |
|---|:--:|:--:|:--:|:--:|:--:|
| Configure components/structures | ✓ | ✓ | – | – | – |
| View/edit compensation 🔒 | ✓ | ✓ | – | – | – |
| Create/calculate run | ✓ | ✓ | – | – | – |
| Approve run | ✓* | ✓* | – | – | – |
| Lock / publish | ✓* | ✓* | – | – | – |
| View payslips (all) | ✓ | ✓ | – | – | – |
| View own payslip | ✓ | ✓ | ✓ | ✓ | ✓ |
| Payroll reports | ✓ | ✓ | – | – | – |

`*` approval/lock may require segregation-of-duties (approver ≠ creator) — a tenant security setting; `needs-expert` on logic PRs.

Permissions: `payroll.view`, `payroll.component.manage`, `payroll.structure.manage`, `payroll.compensation.view/manage`, `payroll.run.create/calculate/approve/lock/publish`, `payroll.payslip.view.self/all`, `payroll.report`, `payroll.export.sensitive`.

States/responsive: desktop-first (dense registers); employee payslip view is mobile-first. Calculation/generation/export are queued jobs with progress + notification (steering rule 3).
