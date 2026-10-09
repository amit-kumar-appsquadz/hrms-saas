# Navigation Map — HRMS SaaS

Status: For review (planner). Full navigation tree and role→section visibility. Items are additionally filtered by granular permissions from `GET /auth/me`; the role columns below show the *default* visibility.

Roles: **SA** Super Admin · **TA** Tenant Admin · **HRA** HR Admin · **HRM** HR Manager · **PA** Payroll Admin · **MGR** Manager · **EMP** Employee.
(SA operates a cross-tenant platform console outside the tenant subdomain — see open question in PRODUCT_UI_SPEC; shown here for completeness.)

## Navigation tree

```
Home / Dashboard
Organization
  ├─ Companies
  ├─ Locations
  ├─ Departments
  ├─ Designations
  ├─ Grades
  ├─ Org hierarchy
  ├─ Holidays
  └─ Work calendars
Employees
  ├─ All employees
  ├─ Add employee
  ├─ Onboarding
  ├─ Transfers & changes
  └─ Exits
Attendance
  ├─ Overview
  ├─ Daily / Monthly
  ├─ My attendance            (self-service)
  ├─ Regularizations
  ├─ Shifts
  ├─ Rosters
  ├─ Policies
  └─ Reports
Leave
  ├─ Overview
  ├─ Apply leave              (self-service)
  ├─ My leave / balances      (self-service)
  ├─ Approvals
  ├─ Team calendar
  ├─ Leave types
  ├─ Leave policies
  └─ Holiday calendar
Payroll
  ├─ Dashboard
  ├─ Salary structures
  ├─ Salary components
  ├─ Employee compensation
  ├─ Payroll runs
  ├─ Payslips
  ├─ Exceptions
  └─ Reports
Compliance
  ├─ Dashboard
  ├─ Provident Fund (PF)
  ├─ ESI
  ├─ Professional Tax (PT)
  ├─ TDS
  ├─ Gratuity
  ├─ Bonus
  └─ Statutory reports & challans
Documents
  ├─ Employee documents
  ├─ Categories
  └─ Bulk upload
Workflows
  ├─ Definitions / Builder
  ├─ Pending approvals
  ├─ Instances
  └─ Delegation
Reports
  ├─ Standard reports
  ├─ Saved reports
  └─ Scheduled reports
Self-service (Employee)       (dedicated area / mobile tabs)
  ├─ My dashboard
  ├─ My profile
  ├─ My attendance
  ├─ My leave
  ├─ My payslips
  ├─ My documents
  ├─ My requests
  └─ Announcements
Team (Manager)
  ├─ Team dashboard
  ├─ Team members
  ├─ Team attendance
  ├─ Approvals
  └─ Team reports
Notifications
  └─ Notification center
Administration
  ├─ Users
  ├─ Roles & permissions
  ├─ Invitations
  └─ Sessions & security
Settings (Tenant/Company)
  ├─ Tenant settings
  ├─ Company settings & branding
  ├─ Localization (tz, currency, working days)
  ├─ Notifications settings
  ├─ Security & MFA policy
  ├─ Data retention (DPDP)
  └─ Custom fields
Audit
  └─ Audit log
Platform (Super Admin only — separate console)
  ├─ Tenants
Platform (Super Admin only — SEPARATE CONSOLE, not a tenant role)
  ├─ Platform dashboard   (tenant counts, employees, MRR, growth, system health, security alerts)
  ├─ Tenants              (list/search/filter · detail · create/edit · activate/suspend · View tenant)
  ├─ Tenant onboarding    (customer info → subdomain → plan → initial tenant admin → provisioning)
  ├─ Platform users       (Super Admin / Operator / Support / Billing — platform.* perms)
  ├─ Platform audit       (tenant lifecycle, platform config, security, billing, access)
  └─ Plans & settings     (subscription plans, onboarding defaults, system settings)
```

## Platform vs tenant separation (IMPLEMENTED; reconciled round 2)
The Super Admin / platform-operator experience is a **separate console**, not an entry in the tenant
role catalog. It lives in its own route group (`(platform)`) with its own session provider, shell
(visually distinct dark chrome), navigation and permission namespace (`platform.*`). It runs on the
**same base domain** (`app.example.com/platform/*` — no admin host; ADR-007 decision 2) with a
**separate login** (`/platform/login` vs tenant `/login`). The security boundary is server-side
(token audience + `platform.*` namespace + separate identity store), not the URL/host (ADR-007 §1).
The two permission worlds never mix: a platform operator holds no tenant permissions and a tenant
role holds no `platform.*` permissions.

Entry flow:
```
Platform operator → app.example.com/platform/login → Platform console → Tenant management
  → "Access tenant (read-only)"  [POST /platform/tenants/{id}/access-sessions, reason required]
  → enters the tenant application READ-ONLY, ≤15-min TTL
  → persistent "Platform/support access — read only" banner offers "Exit to platform"
```
Phase 1 platform→tenant access is **read-only, reason-required, 15-min, fully audited**
(`platform_audit_logs` + tenant audit). Write/full impersonation is deferred. The FE demo's current
"View tenant" impersonation is **ahead of the contract** and must be reconciled to this read-only
access session (API_GAPS § FE demo ahead of contract).


## Role → section visibility (default)

| Section | SA | TA | HRA | HRM | PA | MGR | EMP |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Organization | – | ✓ | ✓ | view | – | – | – |
| Employees | – | ✓ | ✓ | ✓ (scope) | view | team only | self only |
| Attendance (admin) | – | ✓ | ✓ | ✓ | – | team | self |
| Leave (admin cfg) | – | ✓ | ✓ | ✓ | – | approvals/team | apply/self |
| Payroll | – | ✓ | – | – | ✓ | – | payslips (self) |
| Compliance | – | ✓ | – | – | ✓ | – | own tax decl. |
| Documents | – | ✓ | ✓ | ✓ (scope) | – | team view | self |
| Workflows | – | ✓ | ✓ | approver | approver | approver | – |
| Reports | – | ✓ | ✓ | ✓ (scope) | payroll rpts | team rpts | – |
| Self-service | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Team | – | – | – | ✓ | – | ✓ | – |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Administration | – | ✓ | partial | – | – | – | – |
| Settings | – | ✓ | partial | – | partial (payroll) | – | personal only |
| Audit | obs. | ✓ | view | – | view | – | – |
| Platform | ✓ | – | – | – | – | – | – |

Legend: `✓` full, `view` read-only, `scope` limited to assigned company/department, `team only`/`self only` limited to direct reports / own record, `–` hidden.

## Permission-aware behavior
- A nav item renders only if the user holds at least one permission in its required set (defined per page in PAGE_INVENTORY).
- Empty groups collapse/hide entirely (no empty "Payroll" header for an Employee).
- Row/page actions inside a visible section are independently permission-gated (e.g. an HRM may see Employees but not the "Delete" action).
- Counts/badges (approvals, exceptions) only shown to roles that can act on them.
- Self-service vs admin: Employees/Managers primarily use the Self-service/Team areas; admin sections are hidden unless they also hold admin roles.
