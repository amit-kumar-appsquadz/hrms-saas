# Organization Module — HRMS SaaS

Status: For review (planner). Companies, locations, departments, designations, grades, hierarchy, holidays, work calendars. Sprint anchor: S3 (org entities). All org APIs are **gaps** today (contract has only auth/roles/employees); documented in API_GAPS. Org data is tenant-owned and (per data model) company-scoped where applicable; `tenant_id`-first indexing is a backend concern mirrored by the UI's tenant/company context.

Common pattern (every org entity): **List → Create → Edit → View → Archive**, with search, filters, bulk actions, import/export, permissions, and an audit panel. Prefer **archive** over hard-delete when the entity is referenced by employees.

## 1. Companies (`/organization/companies`)
Mid-market groups may have multiple legal entities under one tenant (ADR-001). 
- List columns: legal name, short code, GSTIN/PAN (company PAN is 🔒 — show masked), locations count, employee count, status.
- Create/Edit: legal name, display name, PAN (🔒), registration IDs, registered address, logo (branding).
- View: details + child locations/departments + branding.
- Permissions: `company.view/create/edit/archive`. Archiving a company with active employees is blocked (explain + list blockers).
- Drives the **company selector** in the shell.

## 2. Locations (`/organization/locations`)
- Columns: name, company, city, **state** (drives state-wise PT later — data model), type (HO/branch/site), geo (for attendance geo-fence), employee count, status.
- Create/Edit: name, company, address, state, timezone override (optional), geo-fence (lat/lng/radius — used by attendance S9).
- Permissions: `location.view/create/edit/archive`.

## 3. Departments (`/organization/departments`)
- Columns: name, company, parent department, head (employee), employee count, status.
- Supports nesting (parent department) → feeds Org hierarchy.
- Permissions: `department.*`.

## 4. Designations (`/organization/designations`)
- Columns: title, company, grade (optional link), employee count.
- Permissions: `designation.*`.

## 5. Grades / Bands (`/organization/grades`)
- Columns: name, company, level/order, linked salary band (future payroll link), employee count.
- Permissions: `grade.*`.

## 6. Organization hierarchy (`/organization/hierarchy`)
- Visual department/company org chart (tree). Expand/collapse, zoom, search-to-node, export (PNG/PDF).
- Read-only view assembled from companies→departments; editing happens in the respective entity screens.
- API gap: `GET /org/hierarchy`. Large orgs: lazy-expand nodes.

## 7. Reporting hierarchy (`/organization/reporting`)
- Employee reporting tree from `manager_id` (self-ref in data model). Node = employee card (name, designation, reportee count).
- Cycle detection surfaced as a warning. Used by manager self-service and approvals routing.
- API gap: `GET /org/reporting-tree`.

## 8. Holidays (`/organization/holidays`)
- Holiday lists per calendar/location/year. Columns: date, name, type (public/restricted/optional), location/calendar, recurring.
- Import standard Indian/state holiday sets; bulk add; copy-from-last-year.
- Feeds Leave (holiday calendar) and Attendance/Payroll working-day math.
- Permissions: `holiday.*`. API gap.

## 9. Work locations
- Logical grouping of locations for assignment/geo-fence; may be folded into Locations (§2). Kept as a concept for attendance source/device mapping.

## 10. Work calendars (`/organization/calendars`)
- Define working days/week-offs, weekly-off patterns, holiday-list linkage, per company/location/employee-group.
- Columns: name, scope, working days, week-off rule, linked holiday list.
- Drives attendance expected-days and payroll LOP day counts (expert-verified later).
- Permissions: `calendar.*`. API gap.

## Cross-cutting for org module
- **Import/export:** CSV import (queued, with row-level validation report) for departments/designations/locations/holidays; export for all lists.
- **Bulk actions:** bulk archive, bulk reassign (e.g. move employees between departments → queued).
- **Audit:** every create/edit/archive audited (ADR-003); audit panel per record.
- **States:** standard empty (with "create first X" CTA), loading, error.
- **Responsive:** desktop tables; mobile = read-mostly stacked cards (org admin is a desktop task).
