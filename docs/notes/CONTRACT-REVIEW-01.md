# CONTRACT-REVIEW-01 — Platform/tenant contract & architecture review (planner)

What changed: Performed the pre-backend contract and architecture review. Read steering, `openapi.yaml`, data model, API_GAPS, NAVIGATION/PAGE_INVENTORY/FRONTEND_ARCHITECTURE, ADR-001/002/006, and both FE-DEMO notes; inspected the actual frontend platform implementation (`frontend/src/types/platform.ts`, `services/platform.ts`, `services/platformAuth.ts`, `lib/session.ts`, `types/api.ts`, `lib/demo/platform.ts`) so the contract reflects what was built.

Produced:
- **ADR-007** (platform control plane vs tenant plane) — formalizes two planes, separate auth/audience, separate `platform.*` RBAC, Super Admin not a tenant role, cross-tenant ops only on the platform plane and always audited, impersonation hardened/deferred.
- **ADR-008** (tenant lifecycle + onboarding) — authoritative status set `provisioning/trial/active/suspended/inactive` with per-status rationale, state machine, onboarding flow; reconciles the FE demo set with the brief's set (`pending`=rejected synonym of `provisioning`; `inactive` kept for DPDP offboarding).
- **`openapi.yaml` updated** (v0.1.0-contract-review): added `tenantAuth` + `platformAuth` security schemes (separate audiences), tenant auth-completion paths (password forgot/reset, activate, mfa setup/confirm), and the full `/platform/*` surface (auth, summary, tenants CRUD + activate/suspend/reactivate + admin, onboarding, users, audit, plans, settings) with `TenantId` param, `Conflict` response, and 16 platform schemas. Kept Error/ValidationError/pagination/request_id conventions.
- **PLATFORM_API_SPEC.md**, **TENANT_ONBOARDING_SPEC.md**, **DATA_MODEL_CHANGES.md**, **BACKEND_ROADMAP.md** (B1–B10+), **MULTI_AGENT_PLAN.md** (ownership + dependency graph + security/QA gates).
- **API_GAPS.md updated** — platform + auth-completion items marked promoted (Class A, in contract); remaining true gaps classified (impersonation, billing, audit-store location, platform-RBAC-tables = Class D).

Guardrails honored: no backend/Laravel code; no frontend code modified; no API invented without documenting why (every endpoint traces to the built FE console + a documented gap); tenant isolation not weakened (ADR-001 global scope untouched; platform plane uses a separate surface/audience rather than scope-bypass); Super Admin and tenant roles kept as separate security boundaries (separate identity store, token audience, permission namespace).

Risks:
- Platform plane is a new, high-value attack surface (operator accounts, cross-tenant reach); SEC-1 gate must specifically verify token-audience isolation and plane separation.
- The one sanctioned cross-plane write (initial Tenant Admin creation) must be double-audited and tightly scoped.
- Impersonation is deliberately NOT in the contract yet — building it before resolving ADR-007 Q3 + a security review would be the most likely place to introduce a cross-tenant breach.
- FE demo lacks `inactive`; must be added when the console goes live.

How to verify: open `openapi.yaml` in an OpenAPI viewer/linter — confirm it parses, `platformAuth` is distinct from `tenantAuth`, `/platform/*` paths require `platformAuth`, tenant paths require `tenantAuth`, and no `$ref` dangles (platform schemas all defined). Cross-check `PLATFORM_API_SPEC.md` table against the YAML paths; confirm `DATA_MODEL_CHANGES.md` adds no `tenant_id` to platform tables and no columns to tenant PII tables. Review gate: planner, "You review".

## Unresolved decisions requiring human approval (blockers)
1. Approve ADR-007 (two-plane model) and ADR-008 (status set) as written.
2. Platform plane = path-prefixed surface in the monolith on an operator host (`admin.app.example.com`?) — confirm + DevOps/ADR-002.
3. Impersonation Phase-1 scope (read-only vs limited write), consent mechanism, TTL — gates the impersonation endpoint.
4. Subscriptions: record-keeping vs billing-provider integration in Phase 1.
5. Platform audit storage: shared Atlas (discriminator) vs separate store.
6. Platform RBAC: fixed role enum vs full `platform_roles` tables for Phase 1.
7. Trial length/expiry behavior; `inactive` retention window (DPDP legal sign-off); subdomain immutability.
