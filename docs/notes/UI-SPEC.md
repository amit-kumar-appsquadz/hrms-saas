# UI-SPEC — Product UI / Frontend specification (planner)

What changed: Added `docs/ui/` — a complete, implementation-ready product design and frontend specification for the HRMS SaaS, anchored strictly to approved Sprint 0 artifacts (ADR-001/003/006, `openapi.yaml`, `docs/data-model.md`, `tasks/backlog.json`). 21 documents: index/principles, design system, application shell, navigation, page inventory, dashboards, module specs (employee, organization, RBAC/users, attendance, leave, payroll, compliance, documents, workflow, reporting), self-service/notifications/audit/tenant-admin/search, frontend architecture (Next.js), a Mermaid information-architecture diagram, API gaps, and a sprint-by-sprint implementation roadmap.

Scope guardrails honored: specification only — no application code, no Next.js source, no backend changes, no infra. `openapi.yaml` was **not** modified; every API the UI needs beyond the Sprint 0 contract (auth/roles/employees) is documented in `docs/ui/API_GAPS.md` for the planner to add to the contract before each module's sprint (steering rule 1). No backend endpoints were silently invented.

Design decisions reflected: tenant from subdomain (no tenant selector; company selector only for multi-company tenants) per ADR-001; sensitive PAN/bank/salary masked by default with permission-gated, audited reveal per ADR-006; audit viewer reads the MongoDB Atlas store via a REST facade per ADR-003; payroll/compliance UI is config-driven and never encodes statutory rates (steering rule 5, `needs-expert`); every list paginated/searchable/sortable with the four-states contract and WCAG 2.2 AA baked into the design system (steering rule 3 + accessibility).

Risks:
- The current contract covers only auth/roles/employees, so ~90% of the UI depends on API gaps that must be added sprint-by-sprint; roadmap sequencing assumes those contract updates land before each frontend task.
- Proposed permission slugs and the fixed role catalog are planner proposals and must be reconciled with the RBAC backend task (S2-03) before implementation.
- Super Admin / platform console scope is unresolved (operates outside the tenant subdomain model) and is specced provisionally.

How to verify: open `docs/ui/PRODUCT_UI_SPEC.md` (index) and follow links; render the Mermaid diagrams in `INFORMATION_ARCHITECTURE.md` and `data-model.md`-style viewer to confirm they parse; cross-check `PAGE_INVENTORY.md` routes/permissions against `NAVIGATION.md` and `API_GAPS.md`; confirm no code was added outside `docs/` and `openapi.yaml` is unchanged. Review gate: planner deliverable, "You review".

## Open questions for the human
1. Multiple companies per tenant — confirm (drives the company selector and org scoping; aligns with the data-model open question).
2. Is the Super Admin cross-tenant platform console in scope for this product, or a separate internal tool?
3. Confirm the role catalog and whether roles are fully tenant-custom (fixed list then becomes a seed/default set only).
4. Confirm sensitive-field reveal policy (which fields are reveal-with-permission vs never-revealed in UI) — ties to ADR-006 open question.
5. Mobile strategy for Phase 1: responsive web only, or a native/PWA employee app later?
