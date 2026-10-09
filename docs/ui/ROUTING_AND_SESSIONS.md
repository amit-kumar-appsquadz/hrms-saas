# Routing & Session Model — Platform vs Tenant (same base domain)

Status: Accepted (contract-review round 2). Resolves ADR-007 decision 2 + the additional authentication requirement against ADR-001. Single product/base domain; **no** `admin.app.example.com`. The security boundary is server-side (token audience + permission namespace + identity store + explicit checks), never the URL/host.

## Hosts
| Host | Resolves to | Tenant resolution |
|---|---|---|
| `app.example.com` | base/apex — platform console + tenant login entry | **No tenant** (reserved host, ADR-001 amendment) |
| `<tenant>.app.example.com` | tenant application | Tenant resolved from subdomain (ADR-001, unchanged) |
| reserved labels (`www`,`platform`,`admin`,`api`,`static`,…) | infrastructure/none | Never a tenant; cannot be allocated at onboarding |

## Entry points (separate login experiences — never merged)
```
PLATFORM
  app.example.com/platform/login
    → platform identity store (platform_users)
    → platformAuth token (audience "platform", MFA mandatory)
    → platform.* permissions (fixed role enum)
    → platform console (app.example.com/platform/*)

TENANT
  app.example.com/login            (base-host tenant login; tenant NOT taken from host)
     or
  <tenant>.app.example.com/login   (subdomain tenant login; tenant taken from host)
    → tenant identity store (users, tenant_id)
    → tenantAuth token (audience "tenant", MFA mandatory)
    → tenant.* permissions, tenant global scope
    → tenant HRMS (<tenant>.app.example.com/*)
```

### Base-host tenant login (`app.example.com/login`)
Does **not** pre-resolve a tenant from the host. The tenant is established by authentication (the user's account belongs to exactly one tenant; or, if a future account spans tenants, by an explicit workspace selection). Once authenticated, the session carries the resolved `tenant_id`; the user is directed to `<tenant>.app.example.com` or served on the base host with the `tenant_id` bound into request context. **No tenant data is served until a `tenant_id` is resolved** and the global scope applies — a tenant-scoped API with no resolvable tenant fails closed (`400`/`401`), never defaulting to a tenant.

### Why a tenant user cannot enter the platform plane via `/platform/login`
`/platform/login` authenticates **only** against `platform_users`. A tenant user has no record there; their tenant credentials/token are not valid against the platform identity store, and a `tenantAuth` token is rejected by `/platform/*` (audience check). Knowing the URL grants nothing.

### Why a platform user is not automatically a tenant user
A platform identity (`platformAuth`) carries only `platform.*` and no tenant context. It cannot call tenant endpoints (audience check). The only platform→tenant path is the **read-only access session** below.

## Platform-to-tenant read-only access (ADR-007 §6)
```
Platform operator (platformAuth, platform.tenant.access)
  → POST /platform/tenants/{id}/access-sessions  { reason }   [audited: platform_audit_logs, category=access]
  → server mints a SCOPED tenant-context token:
        audience "tenant", platform_access=true, platform_actor=<operator>, mode=read_only, exp ≤ 15 min
  → operator enters <tenant> workspace, READ-ONLY, with a persistent "Platform/support access — read only" banner
  → every action also written to the tenant audit trail (actor = operator, flagged platform-access)
  → session ends at TTL or via DELETE .../access-sessions/{sid}
```
No tenant writes, no `platform.*` inside the tenant, no silent escalation. Write/full impersonation is deferred (not in the contract).

## Session storage
- **Two independent sessions/tokens**, distinct storage keys (the FE demo already does this: `hrms.demo.platform` vs `hrms.demo.token`, plus a separate impersonation key). A browser may hold a platform session and a (separate) tenant session; neither grants the other's permissions.
- Platform session: short TTL, MFA-gated, aggressive re-auth.
- Access-session token: separate, read-only, ≤15 min, auto-expiring.

## FE reconciliation
- The FE demo's "View tenant" impersonation (sets a tenant session + impersonation banner) must be reconciled to the **read-only access-session** contract: call `access-sessions` with a reason, honor the ≤15-min TTL, enforce read-only, keep the banner. It is currently **ahead of the contract** (demo-only, no reason/TTL/read-only enforcement). Tracked in API_GAPS.
- The FE already uses `/platform/login` and `/login` as separate experiences on the same app — consistent with this model.
