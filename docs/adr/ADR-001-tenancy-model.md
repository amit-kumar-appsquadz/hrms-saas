# ADR-001: Tenancy model

Status: Accepted (Sprint 0). Primary customer segment: mid-market. **Amended (contract-review round 2): added "Platform plane and reserved hosts" to reconcile the same-domain platform console (ADR-007 decision 2) with subdomain tenant resolution — the amendment does not change tenant resolution behavior.**

## Context
Multi-tenant HRMS SaaS for India. Primary target is mid-market (roughly 200-5,000 employees per tenant), not high-volume SMB self-serve and not single-tenant enterprise installs. This shapes the default to favor strong logical isolation and predictable per-tenant query performance, while leaving room for a dedicated-database option for a few large/regulated enterprise tenants later.

## Decision
- **Shared database, shared schema, discriminator column.** One MySQL (RDS) database holds all tenants. Every tenant-owned relational table carries a non-null `tenant_id`.
- **Mandatory global scope.** All tenant-owned Eloquent models use the `BelongsToTenant` trait, which applies a global scope filtering by the current `tenant_id` and auto-fills `tenant_id` on insert. A query that bypasses the scope requires an inline comment explaining why plus a dedicated test (steering rule 2).
- **Index strategy.** `tenant_id` is the first column in every composite index and every unique constraint on tenant-owned tables (e.g. employee email unique becomes `UNIQUE (tenant_id, email)`). Foreign keys stay within the same tenant.
- **Tenant resolution from subdomain.** `<tenant>.app.example.com` resolves to a tenant at the edge/middleware. API URL paths stay tenant-agnostic (no `/tenants/{id}/...`). The resolved tenant is bound into the request context for the global scope.
- **Tenant-prefixed cache keys.** All Redis keys are prefixed with the tenant identifier (`t:{tenant_id}:...`) so cache cannot leak across tenants.
- **No dedicated DB in Phase 1.** Dedicated-database-per-tenant is explicitly out of scope for Phase 1.
- **Preserved seam for dedicated DB.** Tenant -> connection resolution goes through a single `TenantConnectionResolver` abstraction. In Phase 1 it always returns the shared connection; the `tenants` table carries a nullable `db_connection`/placement column so an enterprise tenant can later be routed to a dedicated database without touching call sites.

## Consequences
- Strong, cheap isolation for many mid-market tenants on one cluster; low per-tenant fixed cost.
- A scope miss is a cross-tenant data leak, so isolation tests are mandatory for every new tenant table/endpoint (steering rule 7) and are the top security-review focus in S1-07.
- Composite-index-with-`tenant_id`-first is required for the p95 < 200 ms target; enforced via N+1/index checks (S3-04).
- "Noisy neighbor" risk on the shared cluster; mitigated by per-tenant rate limiting (S6-04) and later by moving a heavy tenant to a dedicated DB via the preserved seam.
- Cross-tenant admin/analytics queries must go through an explicit, audited bypass path, never ad hoc.

## Platform plane and reserved hosts (amendment, contract-review round 2)
This amendment reconciles ADR-007's **same-domain** platform console with subdomain tenant resolution. **Tenant resolution is unchanged**: a tenant is still resolved exclusively from the subdomain `<tenant>.app.example.com`, with the same global scope and cache rules.

What is added:
- **Reserved, non-tenant hosts.** The apex/base host (`app.example.com`) and a small reserved label set (`app`, `www`, `platform`, `admin`, `api`, `static`, plus others as needed) are **not** tenant subdomains. The tenant resolver treats these as "no tenant" rather than attempting to resolve a tenant named `app`/`www`/etc. A reserved label can never be allocated as a tenant subdomain (enforced at onboarding, ADR-008).
- **Platform console lives on the base host, not a separate hostname.** The platform plane is reached at `app.example.com/platform/*` (login at `/platform/login`). There is **no** `admin.app.example.com`. The `/platform/*` path and the base host are routing conveniences only; the security boundary is the platform token audience + `platform.*` namespace + separate identity store (ADR-007 §1), enforced server-side.
- **Tenant login on the base host.** `app.example.com/login` is permitted as a tenant login entry that does not pre-resolve a tenant from the host; the tenant is established by the authenticated session/selected workspace, after which the user operates under `<tenant>.app.example.com` (or a base-host session carrying the resolved `tenant_id`). This does not weaken isolation: no tenant data is served until a `tenant_id` is resolved and the global scope applies.
- **A request on the base host never silently falls back to a default tenant.** If a tenant-scoped API is called without a resolvable tenant context, it fails closed (401/400), never defaulting to an arbitrary tenant.

Why this is safe: the discriminator (`tenant_id`) and the global scope are unchanged; we only declare that certain hosts carry no tenant and that the platform plane shares the domain but not the auth/authorization context. The full host/session model is documented in `docs/ui/ROUTING_AND_SESSIONS.md`.

## Alternatives considered
- **Database-per-tenant from day one:** strongest isolation, simplest noisy-neighbor story, but high fixed cost and migration/ops overhead per tenant; wrong fit for many mid-market tenants. Deferred to an enterprise option behind the seam.
- **Schema-per-tenant (one schema per tenant in MySQL):** isolation without separate instances, but MySQL schema sprawl and migration fan-out across hundreds of schemas is operationally heavy. Not chosen.
- **Row-level security in the DB engine:** MySQL lacks first-class RLS comparable to Postgres; application-level global scope is the practical path. Not chosen.

## Assumptions
- Mid-market scale per tenant is in the low thousands of employees; a single shared cluster (with read replicas later) is sufficient for Phase 1-2.
- Subdomain-per-tenant is acceptable to customers (custom-domain CNAME mapping can be layered on later without changing resolution logic).

## Open questions
- Do any Phase-1 pilot tenants have a contractual data-isolation requirement that forces dedicated DB earlier than planned?
- Tenant identifier in cache/keys: use opaque `tenant_id` (surrogate) vs subdomain slug — confirm the surrogate is stable and never reused.
