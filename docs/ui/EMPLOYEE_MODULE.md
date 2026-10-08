# Employee Module — HRMS SaaS

Status: For review (planner). Employee master, 19-tab profile, lifecycle actions, and onboarding. Sprint anchor: S3 (employee CRUD + list/detail/create UI). Contract: `GET/POST /employees`, `GET/PUT /employees/{id}` exist today; everything beyond the current `Employee`/`EmployeeSummary` schema is a documented API gap.

Sensitive fields (PAN, bank, salary) are masked per ADR-006: list shows nothing sensitive; detail shows `pan_masked` / `bank_account_last4`; full values are never returned, reveal is permission-gated + audited (see API_GAPS for a reveal/audit endpoint).

## 1. Employee list (`/employees`)
`DataTable` (server pagination/sort/filter). API `GET /employees?page&per_page&q&department_id&status`.

Columns: avatar, employee code, name (link), work email, company, department, designation, manager, location, joining date, status badge, row actions.
- **Filters:** status (`active/inactive/on_notice/exited`), department, company, designation, location, manager, joining-date range.
- **Search:** `q` over name/code/work email.
- **Bulk actions:** export (CSV/Excel; sensitive columns need `employee.export.sensitive`), bulk status change / transfer (queued), bulk document request. Destructive bulk → typed confirmation.
- **Row actions:** View, Edit, Transfer, Change manager, Initiate exit, Reactivate (status-dependent, permission-gated).
- **States:** empty ("No employees yet" + Add employee / Import CSV); loading skeleton rows; error with `request_id`.
- **Permissions:** `employee.view` (list), `employee.create`, `employee.edit`, `employee.delete/archive`, `employee.export`, `employee.export.sensitive`.
- **Responsive:** mobile → stacked cards (name, code, dept, status, view action).

## 2. Create / Edit employee (`/employees/new`, `/employees/{id}/edit`)
Multi-step form (also usable inside onboarding). Steps: Basic → Employment → Organization → Contact → Statutory (PAN/bank) → Custom fields → Review.
- API: `POST /employees` / `PUT /employees/{id}`. Write-only `pan`, `bank_account`, `bank_ifsc` (never echoed). `422` → field errors from `ValidationErrorBody.error.fields`.
- Statutory step: PAN format validation client-side (`[A-Z]{5}[0-9]{4}[A-Z]`), stored encrypted + blind-indexed server-side. **No Aadhaar field** (ADR-006) unless the Aadhaar open question is resolved.
- Dirty-guard + draft autosave (onboarding context).

## 3. Employee profile (`/employees/{id}`) — tabbed detail
Header: avatar, name, code, designation @ department, status badge, quick actions (Edit, Transfer, Exit…). Tabs (deep-linkable `/employees/{id}/{tab}`):

| # | Tab | Content | Primary API | Sensitivity / sprint |
|---|---|---|---|---|
| 1 | Overview | Snapshot: org, manager, tenure, quick stats (leave balance, attendance %, pending items) | `GET /employees/{id}` + aggregates (gap) | S3; aggregates later |
| 2 | Personal | DOB, gender, marital status, nationality, blood group, addresses | gap (extend Employee) | S3+ |
| 3 | Employment | Status, employment type, DOJ, confirmation, probation, notice period | `GET /employees/{id}` | S3 |
| 4 | Organization | Company, department, designation, grade, location | `GET /employees/{id}` | S3 |
| 5 | Reporting manager | Manager, dotted-line, reportee list | `GET /employees/{id}` + reportees (gap) | S3 |
| 6 | Contact | Phone, personal email, work phone, current/permanent address | gap | S3+ |
| 7 | Bank details | `bank_account_last4`, IFSC (masked), bank name; reveal (permission + audited) | `GET /employees/{id}` + reveal gap | 🔒 ADR-006 |
| 8 | PAN / Tax | `pan_masked`, tax regime, declarations summary | `GET /employees/{id}` + reveal gap | 🔒; TDS S14 |
| 9 | Documents | Document list, upload, verify, expiry | documents API (gap) | S5 |
| 10 | Qualifications | Education records (degree, institute, year) | gap | S3+ |
| 11 | Experience | Prior employment history | gap | S3+ |
| 12 | Emergency contacts | Contacts (name, relation, phone) | gap | S3+ |
| 13 | Custom fields | EAV-defined fields per tenant | `custom_fields` on Employee; definitions API (gap) | S3 |
| 14 | Leave | Balances, requests, history | leave API (gap) | S7/S8 |
| 15 | Attendance | Punches, regularizations, summary | attendance API (gap) | S9/S10 |
| 16 | Payroll | Compensation, payslips | payroll API (gap) | 🔒; S11–S15 |
| 17 | Assets | Assigned assets | gap | future |
| 18 | Exit | Exit status, F&F, clearance | exit API (gap) | S16 |
| 19 | Audit history | Change log for this employee | audit API (gap, ADR-003) | S4 |

Tabs render only if the user holds the tab's permission; restricted tabs show an inline "restricted" state. Sensitive tabs (7, 8, 16) require explicit permissions and log any reveal.

## 4. Lifecycle actions
Each is a guided action (drawer/modal/wizard), writes via API, is audited, and most route through the workflow engine (S4) once available.

| Action | Flow | API | Notes |
|---|---|---|---|
| Onboarding | §5 wizard | multiple (gap) | Creates employee + user + assignments |
| Create | §2 form | `POST /employees` | — |
| Edit | §2 form | `PUT /employees/{id}` | — |
| Transfer | Pick new company/location/department + effective date | gap `POST /employees/{id}/transfer` | Audited; may need approval |
| Promotion | New designation/grade + effective date + optional comp change | gap | Comp change → payroll approval |
| Manager change | Pick new manager + effective date | gap | Validates no reporting cycle |
| Exit | Exit type, LWD, notice, reason, clearance checklist | gap `POST /employees/{id}/exit` | → F&F (S16); status `on_notice`→`exited` |
| Reactivation | Restore `exited/inactive` → `active` | gap | Permission-gated, audited |

## 5. Employee onboarding (`/employees/onboarding`, `/employees/onboarding/{id}`)
Wizard + checklist. Status pipeline: `invited → details → documents → verification → account → completed`.
- **Checklist / progress** (stepper + task list with pending/done).
- Steps: Employee information → Document upload → Verification → Account creation (user + MFA policy) → Role assignment → Company/Department/Designation/Manager assignment → Bank/Tax info → Welcome communication.
- Pending tasks surfaced on HR dashboard; assignable to HR owner.
- APIs: employee create (`POST /employees`) + onboarding orchestration, document upload, user invite, role assign — all **gaps** except employee create.
- States: list of in-flight onboardings (table), per-candidate wizard with autosave draft, empty state, error.
- Permissions: `employee.onboard`, `user.invite`, `role.assign`.

## 6. Transfers & changes / Exits list views
- `/employees/transfers` — table of pending/effective org changes with approval status.
- `/employees/exits` — table of exits by stage (notice, clearance, F&F, settled); link to each employee's Exit tab.
