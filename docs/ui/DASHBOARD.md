# Dashboard — HRMS SaaS

Status: For review (planner). Role-specific dashboards. Dashboard aggregate APIs are **gaps** (one `GET /dashboard/summary?widgets=` facade, or per-widget endpoints, delivered alongside their modules). KPIs that depend on later modules (attendance/leave/payroll) render a "coming in a later phase / not configured" placeholder until their API exists.

## 1. Dashboard framework
- Grid of **widgets** (KPI stat cards + larger panels). Each widget: title, value/visual, optional delta/trend, drill-down link, and the four-states contract (loading skeleton / empty / error / content).
- **Configurable:** users can show/hide and reorder widgets within the set their role permits (preference persisted — API gap; localStorage fallback).
- Date-range / period selector where relevant (today, this month, custom).
- Every widget is permission-gated — if the user lacks the permission, the widget is omitted (not shown empty).

## 2. KPI cards (catalog)
Total employees · active employees · new joiners (period) · exits (period) · employees on leave today · attendance today (present %) · pending approvals (mine) · upcoming birthdays · upcoming work anniversaries · payroll status (current period) · compliance alerts (count by severity).

## 3. Panels (catalog)
- **Attendance overview** — present/absent/leave split today + 7/30-day trend (line).
- **Headcount trend** — monthly headcount (line/area).
- **Department distribution** — headcount by department (bar/donut).
- **Employee status distribution** — active/on_notice/inactive/exited (donut).
- **Pending approvals** — my approval queue preview (list → Approvals).
- **Recent activity** — recent audited changes relevant to the user (from audit store).
- **Upcoming events** — birthdays, anniversaries, holidays, probation/confirmation due.
- **Announcements** — tenant announcements feed.

## 4. Role-specific dashboards

| Role | Default widgets |
|---|---|
| **Super Admin** (platform console) | Tenants count/health, active tenants, provisioning queue, platform incidents, usage. (Separate console — see PRODUCT_UI_SPEC open question.) |
| **Tenant Admin** | Total/active employees, headcount trend, status distribution, pending approvals (org-wide), payroll status, compliance alerts, recent activity, announcements. |
| **HR Admin** | Total/active, new joiners, exits, onboarding pipeline, pending approvals, documents expiring, upcoming events, attendance overview, announcements. |
| **HR Manager** (scoped) | Scoped headcount (assigned company/dept), new joiners/exits in scope, pending approvals, team attendance/leave today, upcoming events. |
| **Payroll Admin** | Payroll status/period, run progress, exceptions, compliance alerts/due dates, payroll variance, pending payroll approvals. |
| **Manager** | Team size, team present/on-leave today, pending approvals (leave/regularization/changes), team upcoming events, team attendance trend. |
| **Employee** | My attendance (today + month %), my leave balances, pending my-requests, my payslip (latest), my pending tasks (declarations/documents), announcements, upcoming holidays. |

## 5. Responsive
- Desktop/laptop: multi-column widget grid.
- Tablet: 2-column.
- Mobile: single column, prioritized order — self-service roles lead with their action widgets (attendance/leave/payslip/approvals).

## 6. States
- First load: skeleton grid. Per-widget error isolates (one failing widget shows its own error with retry; others render). Empty tenant (fresh) → onboarding checklist dashboard ("Set up company → add employees → configure leave…").
