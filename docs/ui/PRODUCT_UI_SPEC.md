# HRMS SaaS — Product UI / Frontend Specification (index)

Status: For review (planner deliverable; human gate "You review"). Scope: complete product design and frontend specification that the Frontend agent implements later in Next.js. This is **specification only** — no application code, no Next.js source, no backend or infra changes.

Anchored to approved Sprint 0 artifacts: ADR-001 (tenancy from subdomain, shared DB + `tenant_id`), ADR-003 (MongoDB Atlas for audit/punches), ADR-006 (field-level encryption, masked PAN/bank, DPDP), `openapi.yaml` (single contract), `docs/data-model.md` (ERD), and `tasks/backlog.json` (16-sprint plan). Target customer: Indian mid-market, 200–5,000 employees per tenant.

## How to read this spec

| Document | Covers |
|---|---|
| `PRODUCT_UI_SPEC.md` | This index, product principles, cross-cutting UX rules |
| `DESIGN_SYSTEM.md` | Tokens, components, variants, status colors, responsive + a11y rules |
| `APPLICATION_SHELL.md` | Auth screens, authenticated layout, error pages, session handling |
| `NAVIGATION.md` | Full navigation tree + role→section visibility |
| `PAGE_INVENTORY.md` | Every page: route, roles, permissions, API deps, states |
| `DASHBOARD.md` | KPI cards, widgets, role-specific dashboard variants |
| `EMPLOYEE_MODULE.md` | Employee master, 19-tab profile, lifecycle, onboarding |
| `ORGANIZATION_MODULE.md` | Companies, locations, departments, designations, grades, hierarchy, holidays, calendars |
| `RBAC_MODULE.md` | Roles, permissions matrix, user management, permission-aware UI |
| `ATTENDANCE_MODULE.md` | Attendance (future-ready UI), shifts, rosters, regularization |
| `LEAVE_MODULE.md` | Leave types, policies, balances, apply/approve, calendars |
| `PAYROLL_MODULE.md` | Salary structures, payroll runs, payslips, workflow states |
| `COMPLIANCE_MODULE.md` | PF/ESI/PT/TDS/gratuity/bonus UI architecture (config-driven) |
| `DOCUMENT_MODULE.md` | Document categories, upload, preview, verification, audit |
| `WORKFLOW_MODULE.md` | Generic approval engine UI, builder, instances, delegation |
| `REPORTING_MODULE.md` | Reports, saved/scheduled, permission-controlled export |
| `SELF_SERVICE.md` | Employee & manager self-service, notifications, audit, tenant admin, global search |
| `FRONTEND_ARCHITECTURE.md` | Next.js routing, guards, API client, state/data/cache strategy, roadmap |
| `INFORMATION_ARCHITECTURE.md` | Mermaid IA diagram |
| `API_GAPS.md` | APIs required by the UI but missing from `openapi.yaml` |

## Product design principles

1. **Enterprise B2B, not consumer.** Dense, calm, information-first. No decorative gradients, no gaming-style UI, minimal motion (see DESIGN_SYSTEM).
2. **Desktop-first HR administration; mobile-first employee/manager self-service.** Admin modules optimize for wide tables and multi-pane layouts; self-service optimizes for single-column flows.
3. **Permission-aware everywhere.** The UI renders only what `GET /auth/me` permissions allow. Hidden ≠ secure — the server still enforces; the UI mirrors it to avoid dead ends.
4. **Tenant isolation is invisible to the user.** Tenant comes from the subdomain (ADR-001); there is no tenant selector for normal users. A tenant/company **selector** exists only where a user legitimately spans multiple companies within one tenant.
5. **Predictable IA.** Every module follows the same shape: List → Detail (tabs) → Create/Edit (form/wizard) → row/bulk actions → audit history.
6. **Every list is paginated, searchable, sortable, filterable** (steering rule 3). Server-side by default.
7. **Sensitive data is masked by default** (ADR-006). PAN shows `XXXXX1234X`, bank shows last-4. Reveal requires an explicit permission, is logged, and is never bulk-exportable without `*.export.sensitive`.
8. **Destructive actions are protected.** Typed confirmation for irreversible/bulk-destructive actions; archive over hard-delete wherever a record has history.
9. **Statutory/money UI is config-driven and never invents rules.** Payroll/PF/ESI/PT/TDS screens display and configure; calculations and rates come from the backend and are expert-verified (steering rule 5).
10. **WCAG 2.2 AA.** Keyboard, focus, contrast, semantics, ARIA — specified per component.

## Cross-cutting UX rules (apply to every page unless overridden)

- **States contract.** Every data view defines four states: `loading` (skeleton), `empty` (illustration + primary CTA + help link), `error` (message from `Error.error.message`, `request_id` shown for support, retry), `content`. Partial/permission-limited views show an inline "restricted" state rather than a hard error.
- **Error shape.** All API errors use the contract `Error` schema (`error.code`, `error.message`, `error.request_id`). Validation errors use `ValidationErrorBody.error.fields` → mapped to field-level messages. `401` → session-expiry flow; `403` → forbidden page or inline restricted state; `404` → not-found; `422` → inline field errors; `429` → rate-limit toast with retry-after.
- **Pagination contract.** Lists read `meta.page/per_page/total/total_pages` from `PaginatedEnvelope`. Default `per_page = 25`, max 100. URL-synced page/filters so views are shareable and back-button-safe.
- **Optimistic vs pessimistic.** Optimistic UI only for low-risk toggles (e.g. mark notification read). Money, approvals, status changes, and anything audited are pessimistic (await server, then reflect).
- **Autosave vs explicit save.** Multi-step wizards (onboarding, payroll config) autosave drafts; single forms use explicit Save with dirty-state navigation guard.
- **Audit visibility.** Every entity detail page exposes an "Audit history" tab/panel backed by the audit store (ADR-003) once that API exists (see API_GAPS).
- **Confirmation copy.** Confirmations state what happens, scope (how many records), and reversibility. Destructive confirmations require typing the entity name or `DELETE`.
- **Time & locale.** All timestamps rendered in the tenant timezone (default `Asia/Kolkata`); currency `INR ₹` with Indian digit grouping; dates `DD MMM YYYY`.

## Assumptions (planner)
- A tenant may contain multiple companies (group structure) per ADR-001 open question leaning "yes"; the UI assumes company-scoped org data with a company selector. If the human decides single-company-per-tenant, the selector is hidden but the IA is unchanged.
- Role catalog used across this spec: **Super Admin** (platform/cross-tenant, operates outside tenant subdomain), **Tenant Admin**, **HR Admin**, **HR Manager**, **Payroll Admin**, **Manager**, **Employee**. These map to tenant-owned roles (ADR data model `roles`/`permissions`); the permission slugs here are proposed and must be reconciled with the RBAC backend task (S2-03).
- Only auth/roles/employees exist in the contract today. Every other module's APIs are **documented as gaps** in `API_GAPS.md` and must be added by the planner before the matching sprint — the Frontend agent consumes `openapi.yaml`, never invents endpoints.

## Open questions for the human
1. Multiple companies per tenant — confirm (drives company selector + org scoping).
2. Is **Super Admin** (cross-tenant platform console) in scope for this product spec, or a separate internal tool? It operates outside the tenant subdomain model and may need its own IA.
3. Confirm the role catalog and whether roles are fully tenant-custom (then the fixed role list above is only a seed/default set).
4. Sensitive-field reveal: confirm which fields are reveal-with-permission vs never-revealed in UI (ties to ADR-006 open question).
5. Mobile strategy: responsive web only for Phase 1, or is a native/PWA employee app expected later (affects component choices)?
