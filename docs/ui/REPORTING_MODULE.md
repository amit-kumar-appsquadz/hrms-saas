# Reporting Module — HRMS SaaS

Status: For review (planner). Cross-module reporting. APIs are **gaps** (each report maps to a backend reporting endpoint delivered with its module's sprint). Exports are permission-controlled; large exports run as queued jobs (steering rule 3).

## 1. Standard reports (`/reports`)
Catalog of built-in reports grouped by domain; each opens a parameterized report view (filters → run → table + chart → export).

| Group | Reports |
|---|---|
| Employee | Headcount, directory, demographics, new joiners, confirmations due, probation, custom-field extract |
| Organization | Headcount by department/location/grade, org distribution, span-of-control |
| Attendance | Daily/monthly summary, late/early, overtime, absenteeism, muster roll |
| Leave | Balance, utilization, pending, leave liability, encashment |
| Payroll 🔒 | Salary register, bank advice, variance, CTC, reimbursements, deductions |
| Compliance 🔒 | PF ECR, ESI return, PT (state-wise), TDS/Form 24Q, Form 16 status |
| Turnover | Attrition, exits by reason/department, tenure, retention |

## 2. Report view (shared)
- **Filters** (typed: date-range, company, department, location, grade, status, etc.) in a filter bar; required params enforced before run.
- Result: `DataTable` (paginated/sortable) + optional chart (bar/line/donut) with data-table fallback.
- Column visibility + density; totals/subtotals rows where relevant.
- **Export CSV / Excel / PDF**: small → immediate download; large → queued job + completion notification + download from a jobs list. Sensitive columns (salary/PAN/bank) require `report.export.sensitive` and are audited.
- States: run-to-view empty prompt, loading, error, "no data for these filters".

## 3. Saved reports (`/reports/saved`)
- Save a report + its parameters/filters/columns as a named view; share with role/team (permission-gated); set a personal/role default. Edit/duplicate/delete.

## 4. Scheduled reports (`/reports/scheduled`)
- Schedule a saved report (frequency, time, timezone = tenant tz) to be generated and delivered (email/in-app/notification) to recipients. Backend runs on queue/cron. List with next-run, last-run status, pause/resume.
- Scheduled exports of sensitive data require `report.export.sensitive` and are audited; recipient list validated.

## 5. Custom reports (`/reports/custom`) — HR/Admin
- Guided builder: pick entity (employees, leave, attendance…), choose columns/fields (permission-filtered), add filters, grouping, and aggregates; preview; save as a saved report. Not free-form SQL — constrained to permitted fields and tenant scope. API gap (metadata-driven query endpoint).

## Permissions & scope
- `report.view` plus domain scopes (`report.payroll`, `report.compliance`, `report.attendance`, …); exports gated by `report.export` / `report.export.sensitive`.
- Results respect data scope: Manager → team, HRM → assigned company/dept, Employee → self (self-service only). Tenant isolation enforced server-side; UI never shows out-of-scope rows.

## States / responsive
- Four-states on every report; desktop-first (wide tables); mobile = view key reports + download (building reports is a desktop task). All exports/schedules audited.
