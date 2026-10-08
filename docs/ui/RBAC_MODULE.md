# RBAC & User Management Module — HRMS SaaS

Status: For review (planner). Roles, permissions, permission matrix, user management, and permission-aware UI behavior. Sprint anchor: S2 (auth + RBAC). Contract: `GET/POST /roles`, `GET/PUT/DELETE /roles/{id}`, and `GET /auth/me` (roles+permissions) exist. User-management APIs are **gaps**.

Data model: `roles` (tenant-owned, unique `(tenant_id, slug)`), `permissions` (platform-defined catalog), `role_permissions`, `user_roles`, `users`, `mfa_credentials`.

## 1. Roles (`/admin/roles`)
- List: name, slug, # permissions, # users assigned, system vs custom, actions. API `GET /roles` (paginated).
- Create/Edit (`/admin/roles/new`, `/admin/roles/{id}/edit`): name + **permission matrix** selection. API `POST /roles` / `PUT /roles/{id}` with `{ name, permissions: [slug] }`.
- Delete: `DELETE /roles/{id}` — blocked (or warned) if users are assigned; show count + reassignment path. System roles not deletable.
- Permissions: `role.view/create/edit/delete`.

## 2. Permission matrix (role editor core)
Grid: rows = resources/modules (Employees, Organization, Leave, Payroll, Documents, Reports, Admin, Settings, Audit…), columns = **actions**: `view, create, edit, delete, approve, export, sensitive-data access`.
- Checkbox per cell; column header "select all"; row "select all"; module group collapse.
- Dependency hints: enabling `edit` implies `view` (auto-select + lock); `export.sensitive` requires `view` + sensitive-access.
- Each permission maps to a catalog slug (e.g. `employee.view`, `employee.export.sensitive`, `payroll.approve`). The authoritative slug list is owned by the RBAC backend (S2-03) — this UI consumes it (API gap: `GET /permissions` catalog).
- Shows which roles already grant a permission (for governance).
- A11y: real table semantics, keyboard cell navigation, state announced.

## 3. Permission groups
- Optional grouping/presets ("HR read-only", "Payroll approver") to speed role creation. Presets apply a bundle of slugs into the matrix (editable after). API gap.

## 4. User-role assignment
- From a role: list assigned users, add/remove. From a user (§User mgmt): assign/unassign roles. A user may hold multiple roles (union of permissions). API gaps: `GET /roles/{id}/users`, assign/unassign.

## 5. User management (`/admin/users`)
APIs here are **gaps** (not in Sprint 0 contract).
- **User list:** email, linked employee, roles, status (active/invited/disabled), MFA status, last login, actions.
- **Invite user:** email + role(s) + optional employee link → sends activation (`/activate` flow). Gap `POST /users/invite`.
- **Create user:** manual create + link to employee. Gap `POST /users`.
- **Assign employee:** link/unlink a user to an `employees` record (`user_id` FK, nullable).
- **Assign roles:** multi-select roles.
- **Activate / deactivate:** disable login without deleting (status). Gap.
- **Reset password:** trigger reset email (admin-initiated). Gap.
- **MFA status:** enabled/enrolled; admin can require/reset MFA per tenant security policy.
- **Login history:** recent logins (time, IP, device, success/fail) — sourced from audit store (ADR-003). Gap.
- **Sessions:** active sessions list + revoke (Sanctum tokens). Gap `GET/DELETE /users/{id}/sessions`.
- **Permissions (effective):** read-only view of the user's effective permissions (union across roles) for debugging access issues.
- Permissions: `user.view/create/invite/edit/deactivate/reset-password/manage-sessions`.

## 6. Permission-aware UI behavior (applies product-wide)
- Source of truth: `GET /auth/me.permissions` (+ roles). Cached; refreshed on re-auth and on `403`.
- **Navigation:** sections/items hidden unless the user holds a required permission (NAVIGATION.md).
- **Actions:** buttons/menu items rendered only with the matching permission; never shown-but-disabled for security-relevant actions (disabled-with-tooltip only when the reason is non-sensitive, e.g. "archive blocked: active employees").
- **Fields:** sensitive fields masked unless the reveal permission is held; reveal is explicit, per-record, and audited.
- **Routes:** permission guards on route groups (FRONTEND_ARCHITECTURE); direct navigation to a forbidden route → `/403`.
- **Data scope:** HRM/Manager/Employee see scoped data (company/department/self/team); scope enforced server-side, UI reflects empty/partial results without leaking existence of out-of-scope records.
- **Fail-safe:** if permissions are unknown/stale, default to least privilege (hide), never reveal.

## 7. States
- Loading skeletons for role/user tables and the matrix; empty states ("No custom roles — using defaults"); error with `request_id`. Destructive (delete role/deactivate user) → confirmation with impact count.
