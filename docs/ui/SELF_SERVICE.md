# Self-Service, Notifications, Audit, Tenant Admin & Search — HRMS SaaS

Status: For review (planner). Covers employee self-service, manager self-service, notification center, audit log viewer, tenant administration/settings, and global search. Sprint anchors: S4 (audit viewer, notifications), S5 (self-service profile + change request via workflow). APIs beyond auth/roles/employees are **gaps**.

All self-service data is strictly scoped: an employee sees only their own data; a manager sees only direct/indirect reports. Scope is enforced server-side (ADR-001); the UI mirrors it.

---

## A. Employee self-service (`/me/...`, mobile-first)

| Screen | Route | Content | API |
|---|---|---|---|
| My dashboard | `/me` | Employee dashboard (DASHBOARD §4) | dashboard (gap) |
| My profile | `/me/profile` | Own profile (read + request changes); sensitive fields masked (own PAN/bank last-4) | `GET /auth/me` + employee self (gap) |
| My attendance | `/me/attendance` | Punches, summary, punch in/out, regularization (ATTENDANCE §4) | attendance (gap) |
| My leave | `/me/leave` | Balances, apply, history, cancel (LEAVE §5,8) | leave (gap) |
| My payslips | `/me/payslips` | Payslip list + PDF, YTD (PAYROLL §8) | payroll (gap) |
| My documents | `/me/documents` | Own docs, upload required docs (DOCUMENT §1) | documents (gap) |
| My requests | `/me/requests` | All my submitted requests (leave/regularization/profile change/declaration) + status | workflow (gap) |
| My tax declaration | `/me/tax` | Regime + investment declaration + proof upload (COMPLIANCE §5) | tds (gap) |
| Announcements | `/me/announcements` | Tenant announcements feed | notifications (gap) |
| My notifications | `/me/notifications` | Notification center (§C) | notifications (gap) |
| Personal settings | `/me/settings` | Password, MFA, notification prefs, language/theme | auth + prefs (gap) |

**Self-service change request:** profile edits that require approval (e.g. bank details, address) are submitted as a workflow instance (S5-03), not written directly; UI shows "pending approval" and the proposed-vs-current diff. Low-risk fields may update directly if policy allows.

Mobile: bottom tab bar (Home, Attendance/Leave, Approvals*, Payslips, More). `*`Approvals tab only for managers.

---

## B. Manager self-service (`/team/...`)

| Screen | Route | Content | API |
|---|---|---|---|
| Team dashboard | `/team` | Manager dashboard (DASHBOARD §4) | dashboard (gap) |
| Team members | `/team/members` | Direct/indirect reports list → employee profiles (scoped view) | employees (scoped) |
| Team attendance | `/team/attendance` | Team daily/monthly attendance (ATTENDANCE) | attendance (gap) |
| Leave approvals | `/team/approvals` | Approve/reject team leave (LEAVE §6) | leave + workflow (gap) |
| Regularization approvals | `/team/approvals` | Approve regularizations | workflow (gap) |
| Employee requests | `/team/requests` | Team change requests to action | workflow (gap) |
| Team reports | `/team/reports` | Team-scoped reports (REPORTING) | reports (gap) |
| Pending actions | `/team` widget / `/approvals` | Everything awaiting the manager | workflow (gap) |

Manager views reuse the admin components but are scope-limited to the reporting tree (data model `manager_id`). Permissions: `*.view.team`, `approval.act`.

---

## C. Notifications

- **Notification center** (`/notifications` + bell panel): list with unread/read state, category filter, mark-read / mark-all-read, deep-link to the subject (approval, request, payslip).
- **Categories:** approvals, requests, leave, attendance, payroll, documents, compliance, system/announcements.
- **Channels:** in-app (always), **email** (configurable), **SMS architecture** ready — SMS requires TRAI DLT registration (backlog S0-10); UI exposes SMS preferences but delivery depends on DLT approval. Channel availability per category.
- **Preferences** (`/me/settings` + tenant defaults): per-category channel toggles; respect tenant notification settings.
- Optimistic mark-read; counts update live. APIs are **gaps** (`GET /notifications`, mark-read, preferences).

---

## D. Audit log viewer (`/audit`) — S4-02

Audit data in **MongoDB Atlas** via `AuditLogStore` (ADR-003); UI reads a REST facade (gap: `GET /audit?filters&page`).
- List columns: timestamp (tenant tz), actor (user), action, entity type + id, tenant, IP, request-id.
- **Before/after** diff viewer per entry (expand/drawer) — sensitive values remain masked in audit view unless the viewer has sensitive-access (and that view is itself logged).
- Filters: date-range, actor, entity type, action, entity id, IP. Full-text where supported.
- Export (queued; permission `audit.export`). Append-only — no edit/delete in UI.
- Entity-scoped audit panels (employee tab 19, workflow instance timeline, document trail, payroll run history) query the same store filtered to that entity.
- Permissions: `audit.view`, `audit.export`, `audit.view.sensitive`. Pagination mandatory (high volume).

---

## E. Tenant administration & settings (`/settings/...`) — Tenant Admin

| Screen | Settings |
|---|---|
| Tenant settings | Tenant name, subdomain (read-only/display; change is a platform op), status |
| Company settings & branding | Per-company logo, colors (within design-token constraints), legal details |
| Localization | Timezone (default `Asia/Kolkata`), currency (`INR`), date/number format, language, working days |
| Holiday settings | Links to Organization → Holidays / calendars |
| Notification settings | Default channels per category, sender identities, SMS/DLT config |
| Security settings | Password policy, session timeout + warning lead-time, allowed IPs (optional), login lockout |
| Session settings | Max session length, concurrent-session policy |
| MFA settings | MFA required/optional, enforcement per role, recovery policy |
| Data retention (DPDP) | Retention periods per data category, erasure policy vs statutory retention (ADR-006), consent config, DSAR/erasure request handling |
| Custom fields | Define employee custom fields (EAV) — key, type, options, required |

- Settings changes are audited; security/retention changes are high-sensitivity (confirmation + audit + possibly `needs-expert`/legal for retention).
- Permissions: `settings.view`, `settings.manage`, `settings.security.manage`, `settings.retention.manage`, `customfield.manage`.
- APIs are **gaps** (`GET/PUT /settings/...`).

---

## F. Global search (`Ctrl/Cmd+K`, top bar)

- Command palette across **permitted** entities: employees, companies, departments, documents, requests, reports (+ quick navigation actions).
- Results grouped by type, each row permission- and tenant-filtered server-side (never returns out-of-scope results). Keyboard-navigable; recent/frequent suggestions.
- API **gap**: `GET /search?q=&types=`. Must enforce tenant isolation + per-type permissions server-side; UI shows only groups the user can access.
- Debounced, paginated per group, loading/empty/error states; `request_id` on error.

## States / responsive (all of A–F)
Four-states contract everywhere. Self-service (A) and manager approvals (B) are mobile-first; audit (D), settings (E), and search building are desktop-first (search palette works on all sizes).
