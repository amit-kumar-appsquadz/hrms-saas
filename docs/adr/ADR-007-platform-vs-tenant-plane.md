# ADR-007: Platform control plane vs tenant plane

Status: **Accepted** (human-approved, contract-review round 2). Depends on ADR-001 (tenancy), ADR-006 (security/DPDP), ADR-003 (audit store). Supersedes the "Proposed" draft; the 7 open questions are now resolved by approved decisions (see "Resolved decisions").

## Context
The product has two distinct experiences: the **tenant application** (used by Tenant Admin / HR Admin / Manager / Employee) and a **platform administration console** (SaaS operator, cross-tenant). The frontend demo already enforces the separation structurally — separate session key, separate `platform.*` permission namespace, separate shell, and a unit test asserting no permission overlap (`docs/notes/FE-DEMO-02.md`).

Getting the boundary wrong is a cross-tenant data-leak class of bug. ADR-001's isolation model (global `tenant_id` scope resolved from subdomain) assumes a request belongs to exactly one tenant. A platform actor is cross-tenant; it must therefore live on a **separate plane** with its own identity, token, and authorization — never as a privileged tenant role bypassing the global scope.

## Decision
Two planes with **separate authentication, authorization, identity stores, and token audiences**, served from the **same application/base domain** (no separate admin hostname).

### 1. The security boundary is server-side, not the URL or hostname
The plane boundary is enforced by, in order:
1. **Identity store** — platform users (`platform_users`) vs tenant users (`users`); different tables, no shared rows.
2. **Token audience** — `platformAuth` (audience `platform`) vs `tenantAuth` (audience `tenant`). A middleware/guard rejects a token whose audience does not match the plane of the endpoint.
3. **Authorization namespace** — `platform.*` vs `tenant.*` permissions; disjoint catalogs; a platform token carries no `tenant.*` and vice versa.
4. **Tenant context** — tenant-plane requests resolve exactly one `tenant_id` and apply the `BelongsToTenant` global scope; platform-plane requests have **no** tenant global scope and operate on platform-owned tables.
5. **Explicit access-control checks** — every endpoint authorizes the specific permission; cross-tenant reads are an explicit, audited code path.

The `/platform/*` path prefix and any hostname are **routing conveniences only** and are explicitly **not** relied on as the security boundary. Even if a request reached a platform route with a tenant token (or vice versa), the audience + namespace checks reject it.

### 2. Same application domain, separate login experiences (approved decision 2 + additional auth requirement)
- One product/base domain. **No** `admin.app.example.com`.
- **Platform login:** `app.example.com/platform/login` → platform identity → `platformAuth`.
- **Tenant login:** `app.example.com/login` (base domain) and/or `<tenant>.app.example.com/login` (tenant subdomain) → tenant identity → `tenantAuth`.
- The two login flows are **separate authentication systems** and must not be merged into one generic login. A platform user authenticating does **not** become a tenant user; a tenant user cannot authenticate into the platform plane merely by visiting `/platform/login` — they have no `platform_users` record and their credentials are not valid against the platform identity store.
- Routing/host model is specified in `docs/ui/ROUTING_AND_SESSIONS.md` and reconciled into ADR-001.

### 3. Separate authentication, both planes MFA-mandatory
- **Tenant auth** (ADR-006): Sanctum, tenant token audience `tenant`, resolved tenant context, **MFA mandatory** (upgraded from "per tenant policy" to mandatory per approved decision 1).
- **Platform auth:** separate login, token audience `platform`, **MFA mandatory**, short session lifetime, aggressive re-auth. Platform tokens rejected by tenant endpoints and vice versa (audience check).

### 4. Separate authorization — fixed platform role enum in Phase 1 (approved decision 6)
- Tenant authorization: tenant RBAC (`permissions` + tenant `roles`), gated by the global scope.
- Platform authorization: a **fixed role enum** in Phase 1 — `PLATFORM_SUPER_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_OPERATIONS`, `PLATFORM_AUDITOR` — mapped in code to `platform.*` permissions. **No** configurable `platform_roles`/`platform_role_permissions` tables in Phase 1. A documented extension point allows configurable platform RBAC later without changing call sites (authorization goes through a `PlatformAuthorizer` that today reads the enum map and could later read tables). Platform and tenant roles/permissions remain completely separate.

### 5. Cross-tenant operations are explicit, platform-only, and audited
No ordinary tenant endpoint ever returns another tenant's data. Any cross-tenant operation is a **platform endpoint** that: carries a platform token + specific `platform.*` permission; reaches a target tenant's data only via the `TenantConnectionResolver` seam (ADR-001) and only for **administrative** fields (status, plan, usage counts) — not bulk employee/PII; and writes a `platform_audit_logs` entry per call (approved decision 5; §7).

### 6. Platform-to-tenant access is READ-ONLY in Phase 1 (approved decision 3)
Phase-1 support access into a tenant is a **read-only, explicitly initiated, reason-required, fully audited, 15-minute-max** scoped session:
- Initiated by an authorized platform user (`platform.tenant.access` permission) with a mandatory **reason/justification**.
- Mints a **read-only scoped tenant context token** (audience `tenant`, flag `platform_access=true`, `platform_actor` claim, `exp ≤ 15 min`) that grants **read-only** access and **no tenant write** and **no `platform.*`** inside the tenant.
- The tenant UI shows a persistent, clearly labelled "Platform/support access — read only" banner; tenant context is explicit.
- Every access is double-audited: `platform_audit_logs` (category `access`, with reason + session id + target tenant) and the tenant audit trail (actor = platform operator, marked platform-access).
- **No silent privilege escalation; no unrestricted tenant writes.** Full/write impersonation and delegated tenant actions are **deferred** to a future decision and are **not** exposed in the contract.
- Contract: `POST /platform/tenants/{tenantId}/access-sessions` (start read-only session) + `DELETE .../access-sessions/{id}` (end early). Named "access-session", not "impersonate", to reflect the read-only scope.

### 7. Platform audit in a separate collection (approved decision 5)
Platform audit events are written to a **separate MongoDB Atlas collection `platform_audit_logs`** (ADR-003 store, via a `PlatformAuditLogStore` interface), **never mixed** with tenant `audit_logs`. Each event includes: platform actor, action, target resource, target tenant (when applicable), timestamp, request/correlation id, result/status, reason (where required), and access/session context (where applicable). Append-only; retention aligned with the security/log-archive plane (ADR-002).

### 8. Platform-owned vs tenant-owned data
- **Platform-owned** (NO `tenant_id`, no global scope): `platform_users`, `plans`, `subscriptions`, `tenant_onboarding`, `platform_audit_logs` (Mongo), `platform_settings`, and the authoritative lifecycle columns on the existing `tenants` table. Platform tables reference a tenant via a plain FK to `tenants` where needed — this is **not** the tenancy discriminator.
- **Tenant-owned** (unchanged, ADR-001): everything else, with mandatory `tenant_id`, global scope, and `tenant_id`-first composite indexes/uniques.
- The `tenants` table is the single bridge: platform-owned, read by the tenant resolver, written by the platform plane for lifecycle/plan.

## Resolved decisions (round 2 — these close the previous open questions)
1. Two-plane model **approved**; boundary enforced server-side (identity/audience/namespace/context/checks), not URL/host.
2. **Same base domain**, no admin hostname; separate `/platform/login` and `/login` experiences; tenant subdomain preserved (ADR-001 reconciled in ADR-001 §"Platform plane and reserved hosts").
3. Platform-to-tenant access **read-only, 15-min, reason-required, audited** in Phase 1; write impersonation deferred.
4. Subscriptions = **record-keeping only** in Phase 1; schema future-proofed for a billing provider; no payment APIs invented (ADR-008 / data model).
5. Platform audit = **separate collection `platform_audit_logs`**.
6. Platform RBAC = **fixed role enum** in Phase 1 with a documented extension point.
7. Tenant lifecycle defaults approved (ADR-008): `provisioning→trial→active→suspended→inactive`; 30-day configurable trial; immutable unique subdomain.

## Consequences
- Clean boundary that preserves ADR-001: tenant endpoints never need a scope bypass; the global scope stays absolute and testable.
- Same-domain hosting removes a separate admin host but **requires** the base/apex host to be a reserved non-tenant host (ADR-001 reconciliation) so `app.example.com/platform/login` does not attempt tenant resolution.
- Both planes MFA-mandatory raises the auth baseline; brute-force/rate-limit protection needed on both login endpoints.
- Read-only Phase-1 access-session is far safer than write impersonation; the contract deliberately exposes only the read-only session.
- Fixed platform role enum reduces Phase-1 scope; the `PlatformAuthorizer` seam avoids a rewrite when configurable RBAC arrives.

## Alternatives considered
- **Super Admin as a tenant super-role with scope-bypass:** rejected — violates ADR-001/steering rule 2.
- **Single generic login, claim-based plane switch:** rejected — explicitly disallowed by the approved auth requirement; one guard bug would cross the boundary. Separate audiences fail safe.
- **Separate admin hostname (`admin.app.example.com`):** rejected by approved decision 2 (unified product domain). Boundary is server-side regardless of host.
- **Write impersonation in Phase 1:** deferred — read-only session is sufficient for support and dramatically lowers risk.

## Assumptions
- Platform user count is small (internal operators); no self-serve platform signup in Phase 1.
- Reserving the apex/`app` host as non-tenant is acceptable (no customer tenant may claim subdomain `app`/`www`/`platform` etc. — reserved list in ADR-001).

## Open questions (remaining, non-blocking)
- `inactive` retention window length is a **legal/compliance policy** input (DPDP + statutory payroll retention), not an engineering decision — flagged for legal sign-off before any real offboarding/purge (does not block build; purge job ships behind a configurable, unset-by-default retention period).
