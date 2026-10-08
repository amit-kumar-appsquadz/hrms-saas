# Page Inventory — HRMS SaaS

Status: For review (planner). Every page across the whole product. Columns: route · purpose · allowed roles · required permission(s) · API deps (⚠ = gap, see API_GAPS) · key components · states. Unless noted, every page follows the **four-states contract** (loading skeleton / empty / error-with-`request_id` / content) and is responsive per DESIGN_SYSTEM §8. Roles: SA/TA/HRA/HRM/PA/MGR/EMP.

Legend: ✔ in Sprint 0 contract · ⚠ API gap.

## Auth & shell (unauthenticated + system)
| Route | Purpose | Roles | Perms | API | Components | States note |
|---|---|---|---|---|---|---|
| `/login` | Email/password login | all | – | ✔ `/auth/login` | AuthCard, Form | inline cred/429 errors |
| `/login/mfa` | TOTP verify | all | – | ✔ `/auth/mfa/verify` | OTP input | resend/retry |
| `/forgot-password` | Request reset | all | – | ⚠ forgot | Form | neutral success |
| `/reset-password` | Set new password | all | – | ⚠ reset | Form, strength | token-invalid |
| `/activate` | Invited-user setup | all | – | ⚠ activate | Form, stepper | token-invalid |
| `/mfa/setup` | Enrol MFA | all | – | ⚠ mfa setup | QR, codes | — |
| `/401 /403 /404 /500 /maintenance` | System pages | all | – | – | ErrorPage | role=alert |

## Dashboard
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/dashboard` | Role-specific dashboard | all | `dashboard.view` | ⚠ dashboard summary | KPI cards, charts, panels |
| `/me` | Employee dashboard | all | self | ⚠ dashboard | KPI cards |
| `/team` | Manager dashboard | MGR+ | `*.view.team` | ⚠ dashboard | KPI cards |

## Organization
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/organization/companies` | Companies list | TA,HRA | `company.view` | ⚠ `/companies` | DataTable |
| `/organization/companies/{id}` | Company detail | TA,HRA | `company.view` | ⚠ | Tabs, Audit panel |
| `/organization/companies/new|{id}/edit` | Create/edit | TA | `company.create/edit` | ⚠ | Form |
| `/organization/locations` (+ `/new`,`/{id}`,`/edit`) | Locations CRUD | TA,HRA | `location.*` | ⚠ `/locations` | DataTable, Form, Map |
| `/organization/departments` (+CRUD) | Departments | TA,HRA | `department.*` | ⚠ | DataTable, Form |
| `/organization/designations` (+CRUD) | Designations | TA,HRA | `designation.*` | ⚠ | DataTable, Form |
| `/organization/grades` (+CRUD) | Grades | TA,HRA | `grade.*` | ⚠ | DataTable, Form |
| `/organization/hierarchy` | Org chart | TA,HRA,HRM(view) | `org.view` | ⚠ hierarchy | OrgChart |
| `/organization/reporting` | Reporting tree | TA,HRA,HRM | `org.view` | ⚠ reporting-tree | OrgChart |
| `/organization/holidays` (+CRUD/import) | Holidays | TA,HRA | `holiday.*` | ⚠ `/holidays` | DataTable, Importer |
| `/organization/calendars` (+CRUD) | Work calendars | TA,HRA | `calendar.*` | ⚠ `/calendars` | DataTable, Form |

## Employees
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/employees` | Employee list | TA,HRA,HRM,PA(view),MGR(team),EMP(self) | `employee.view` | ✔ `/employees` | DataTable, Filters |
| `/employees/new` | Create | TA,HRA | `employee.create` | ✔ POST | Multi-step Form |
| `/employees/{id}` (+ 19 tabs) | Profile detail | scoped | `employee.view` (+ per-tab) | ✔ GET + ⚠ tab APIs + ⚠ reveal | Tabs, Timeline, Drawer |
| `/employees/{id}/edit` | Edit | TA,HRA | `employee.edit` | ✔ PUT | Form |
| `/employees/onboarding` (+`/{id}`) | Onboarding pipeline/wizard | TA,HRA | `employee.onboard` | ⚠ onboarding | Stepper, Checklist |
| `/employees/transfers` | Transfers/changes list | TA,HRA | `employee.edit` | ⚠ lifecycle | DataTable |
| `/employees/exits` | Exits list | TA,HRA | `employee.exit` | ⚠ exit | DataTable |
| lifecycle actions (transfer/promote/manager/exit/reactivate) | drawers/modals | TA,HRA | per action | ⚠ | Form, Confirm |

## Attendance (S9–S10)
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/attendance` | Dashboard | TA,HRA,HRM | `attendance.view.all` | ⚠ | KPI, charts |
| `/attendance/daily` | Daily | HRA,HRM,MGR(team) | `attendance.view.*` | ⚠ daily | DataTable |
| `/attendance/monthly` | Monthly matrix | HRA,HRM | `attendance.view.*` | ⚠ monthly | Matrix grid |
| `/me/attendance` | My attendance + punch | all | `attendance.punch` | ⚠ punch/me | Calendar, PunchCard |
| `/attendance/regularizations` | Regularization queue | MGR,HRA | `regularization.*` | ⚠ + workflow | DataTable, ApprovalCard |
| `/attendance/shifts` (+CRUD) | Shifts | HRA | `shift.manage` | ⚠ `/shifts` | DataTable, Form |
| `/attendance/rosters` | Rosters | HRA,MGR(team) | `roster.manage` | ⚠ `/rosters` | Grid |
| `/attendance/policies` (+CRUD) | Policies | HRA | `attendance.policy.manage` | ⚠ | Form |
| `/attendance/reports` | Reports | HRA,HRM | `attendance.report` | ⚠ | ReportView |

## Leave (S7–S8)
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/leave` | Leave dashboard | all | `leave.view.*` | ⚠ | KPI, calendar |
| `/me/leave` / `/me/leave/apply` | My leave / apply | all | `leave.apply` | ⚠ requests | Form, BalanceCard |
| `/leave/approvals` | Approve/reject | MGR,HRA | `leave.approve` | ⚠ + workflow | ApprovalQueue |
| `/leave/balances` | Balances | HRA | `leave.view.all` | ⚠ balances | DataTable |
| `/leave/team-calendar` | Team calendar | MGR,HRA | `leave.view.team` | ⚠ | Calendar |
| `/leave/types` (+CRUD) | Leave types | HRA | `leave.type.manage` | ⚠ types | DataTable, Form |
| `/leave/policies` (+CRUD) | Policies | HRA | `leave.policy.manage` | ⚠ policies | Form |
| `/leave/holidays` | Holiday calendar | all | `leave.view.*` | ⚠ (org holidays) | Calendar |

## Payroll (S11–S16) — all 🔒 sensitive, permission-gated
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/payroll` | Dashboard | PA,TA | `payroll.view` | ⚠ | KPI, status |
| `/payroll/config` | Config | PA,TA | `payroll.view` | ⚠ config | Form |
| `/payroll/components` (+CRUD) | Salary components | PA,TA | `payroll.component.manage` | ⚠ | DataTable, Form |
| `/payroll/structures` (+CRUD) | Salary structures | PA,TA | `payroll.structure.manage` | ⚠ | Form, Preview |
| `/payroll/compensation` | Employee comp | PA,TA | `payroll.compensation.view/manage` | ⚠ | DataTable (masked) |
| `/payroll/runs` | Runs list | PA,TA | `payroll.view` | ⚠ runs | DataTable |
| `/payroll/runs/{id}` | Run stepper (Draft→Publish) | PA,TA | run-stage perms | ⚠ stage actions | Stepper, Register, Progress |
| `/payroll/runs/{id}/review` | Review register | PA,TA | `payroll.view` | ⚠ register | DataTable, Drawer |
| `/payroll/exceptions` | Exceptions | PA,TA | `payroll.view` | ⚠ exceptions | DataTable |
| `/payroll/payslips` | Payslips (all) | PA,TA | `payroll.payslip.view.all` | ⚠ payslips | DataTable, PDF |
| `/me/payslips` | My payslips | all | `payroll.payslip.view.self` | ⚠ me/payslips | List, PDF |
| `/payroll/reports` | Payroll reports | PA,TA | `payroll.report` | ⚠ | ReportView |
| `/payroll/history` | Run history + audit | PA,TA | `payroll.view` | ⚠ + audit | DataTable, Timeline |

## Compliance (S11–S15) — config-driven, 🔒, needs-expert
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/compliance` | Dashboard + alerts | PA,TA | `compliance.view` | ⚠ | KPI, Alerts |
| `/compliance/pf` | PF config + computed + ECR | PA,TA | `compliance.*` | ⚠ pf/ecr | Form, DataTable |
| `/compliance/esi` | ESI | PA,TA | `compliance.*` | ⚠ esi | Form, DataTable |
| `/compliance/pt` | PT (state-wise) | PA,TA | `compliance.*` | ⚠ pt | Form, DataTable |
| `/compliance/tds` | TDS + declarations | PA,TA | `compliance.*` | ⚠ tds | Form, DataTable |
| `/me/tax` | My tax declaration | all | `tds.declaration.submit` | ⚠ me/tax-declaration | Form, Upload |
| `/compliance/gratuity` | Gratuity | PA,TA | `compliance.*` | ⚠ | DataTable |
| `/compliance/bonus` | Bonus | PA,TA | `compliance.*` | ⚠ | DataTable |
| `/compliance/reports` | Challans/Forms 24Q/16 | PA,TA | `compliance.export` | ⚠ | ReportView |

## Documents (S5)
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/documents` | All documents | HRA,HRM(team) | `document.view.*` | ⚠ documents | DataTable |
| `/employees/{id}/documents` | Employee docs tab | scoped | `document.view.*` | ⚠ | List, Upload, Preview |
| `/me/documents` | My documents | all | `document.view.self` | ⚠ | List, Upload |
| `/documents/categories` (+CRUD) | Categories | HRA | `document.category.manage` | ⚠ | DataTable, Form |
| `/documents/bulk` | Bulk upload | HRA | `document.bulk.upload` | ⚠ bulk (queued) | Dropzone, JobResult |

## Workflows / Approvals (S4)
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/approvals` | My approval inbox | approvers | `approval.act` | ⚠ approvals | ApprovalQueue, Drawer |
| `/workflows/definitions` | Definitions list | HRA,TA | `workflow.definition.manage` | ⚠ | DataTable |
| `/workflows/builder/{id}` | Builder | HRA,TA | `workflow.definition.manage` | ⚠ | Canvas builder (desktop) |
| `/workflows/instances` (+`/{id}`) | Instances | HRA,TA | `workflow.instance.view` | ⚠ | DataTable, Timeline |
| `/workflows/delegation` | Delegation | all approvers | `delegation.manage` | ⚠ | Form |

## Reports (cross-module)
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/reports` | Catalog + run | HRA,HRM,PA,TA | `report.view` (+domain) | ⚠ reports | ReportView, Export |
| `/reports/saved` | Saved reports | same | `report.view` | ⚠ saved | DataTable |
| `/reports/scheduled` | Scheduled | HRA,PA,TA | `report.view` | ⚠ scheduled | DataTable, Form |
| `/reports/custom` | Custom builder | HRA,TA | `report.view` | ⚠ custom | Builder |

## Self-service & team
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/me/profile` | My profile + change req | all | self | ⚠ self + change-req | Tabs, Form |
| `/me/requests` | My requests | all | self | ⚠ workflow | DataTable |
| `/me/notifications` + `/me/announcements` | Notifications/announce | all | self | ⚠ notifications | List |
| `/me/settings` | Personal settings | all | self | ⚠ prefs/auth | Form, MFA |
| `/team/members` | Team members | MGR+ | `employee.view.team` | ✔/⚠ scoped | DataTable |
| `/team/attendance` | Team attendance | MGR+ | `attendance.view.team` | ⚠ | DataTable |
| `/team/approvals` | Team approvals | MGR+ | `approval.act` | ⚠ workflow | ApprovalQueue |
| `/team/requests` | Team requests | MGR+ | `approval.act` | ⚠ | DataTable |
| `/team/reports` | Team reports | MGR+ | `report.view` (team) | ⚠ | ReportView |

## Administration & settings
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/admin/users` (+ detail/invite) | Users | TA,HRA(partial) | `user.*` | ⚠ users | DataTable, Form |
| `/admin/roles` (+CRUD) | Roles | TA | `role.*` | ✔ `/roles` | DataTable, Matrix |
| `/admin/roles/{id}/edit` | Role + permission matrix | TA | `role.edit` | ✔ + ⚠ permissions catalog | PermissionMatrix |
| `/admin/invitations` | Invitations | TA,HRA | `user.invite` | ⚠ | DataTable |
| `/admin/sessions` | Sessions/security | TA | `user.manage-sessions` | ⚠ sessions | DataTable |
| `/settings/*` (tenant/company/localization/notifications/security/mfa/sessions/retention/custom-fields) | Settings | TA (+PA payroll, EMP personal) | `settings.*` | ⚠ settings | Form sections |

## Audit
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/audit` | Audit log (Mongo via facade) | TA,HRA(view),PA(view) | `audit.view` | ⚠ `/audit` | DataTable, DiffViewer |

## Platform (Super Admin — SEPARATE CONSOLE, implemented in the demo)
Platform-level operator experience, outside the tenant subdomain and tenant role model. Own route group `(platform)`, own session/shell/nav, `platform.*` permissions. APIs are gaps (API_GAPS § Platform console); demo-backed.
| Route | Purpose | Roles | Perms | API | Components |
|---|---|---|---|---|---|
| `/platform/login` | Platform operator sign-in | SA | – | ⚠ platform auth | AuthCard, Form |
| `/platform` | Platform dashboard (tenant counts, employees, MRR, growth, system health, activity, security alerts) | SA | `platform.dashboard.view` | ⚠ platform summary | KPI cards, charts, panels |
| `/platform/tenants` | Tenant list (search/filter/status/plan) | SA | `platform.tenant.view` | ⚠ platform tenants | DataTable, Filters |
| `/platform/tenants/{id}` | Tenant detail (overview, admin, subscription, usage, activity, audit) + activate/suspend + View tenant | SA | `platform.tenant.*` | ⚠ | Tabs, Timeline, Confirm |
| `/platform/onboarding` | Tenant onboarding wizard (customer → subdomain → plan → admin → provision) | SA | `platform.tenant.create` | ⚠ onboarding | Stepper, Form |
| `/platform/users` | Platform users (Super Admin/Operator/Support/Billing) | SA | `platform.user.view` | ⚠ platform users | DataTable |
| `/platform/audit` | Platform audit (tenant lifecycle, config, security, billing, access) | SA | `platform.audit.view` | ⚠ platform audit | DataTable |
| `/platform/settings` | Plans & settings (subscription plans, onboarding defaults, system) | SA | `platform.settings.view` | ⚠ platform plans/settings | Form sections |

Tenant impersonation: "View tenant" (perm `platform.tenant.impersonate`) enters the existing tenant `(app)` application with an impersonation banner. Demo-only affordance; production is an audited, consent-gated session (API_GAPS).


---

## Page count (approximate, counting route families; CRUD sub-routes as groups)
- Auth & system: **12**
- Dashboard: **3**
- Organization: **11** families (~30+ with CRUD sub-routes)
- Employees: **8** families (profile = 1 route, 19 tabs)
- Attendance: **9**
- Leave: **8**
- Payroll: **13**
- Compliance: **9**
- Documents: **5**
- Workflows/Approvals: **5**
- Reports: **4**
- Self-service & team: **10**
- Admin & settings: **6** families (settings expands to ~10 sub-pages)
- Audit: **1**
- Platform: **3**

**Total: ~107 route families**, expanding to **~180–200 distinct screens/states** once CRUD sub-routes (new/edit/view), the 19 employee tabs, the 8-stage payroll run, and settings sub-pages are counted individually.
