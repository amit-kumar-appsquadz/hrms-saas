<?php

namespace App\Tenancy;

/**
 * TenantContext (B1-05)
 * ---------------------
 * Request-scoped holder of the resolved tenant for the tenant plane.
 *
 * This is the single place the rest of the application asks "which tenant is
 * this request for?". In B1-06 the `BelongsToTenant` global scope reads
 * `tenantId()` from here; auth guards (B1-07) and cache-key helpers key off the
 * same context. Nothing else should read the host directly — the host is a
 * routing concern consumed only by `ResolveTenant`.
 *
 * FAIL-CLOSED CONTRACT (ADR-001 amendment, ADR-007 §1):
 *   - The context starts EMPTY (no tenant). It is NEVER seeded with a default.
 *   - A tenant is set exactly once, by `ResolveTenant`, after a successful
 *     subdomain lookup + status gate.
 *   - Base/reserved hosts legitimately leave the context empty (platform plane
 *     and base-host tenant login resolve the tenant later from the session).
 *   - Any tenant-scoped consumer MUST call `requireTenantId()` (or check
 *     `hasTenant()`); reading `tenantId()` when none is set returns null and a
 *     scope that silently treats null as "all tenants" would be a cross-tenant
 *     leak — hence `requireTenantId()` throws.
 *
 * Bound as a singleton for the request lifecycle (see TenancyServiceProvider).
 * Registered as a singleton — one instance per request under Octane because
 * Octane resets the container state between requests; `reset()` is also called
 * defensively by the resolver.
 */
class TenantContext
{
    /**
     * The resolved tenant identifier (surrogate id from the `tenants` table),
     * or null when no tenant is resolved (base/reserved host, or not yet set).
     */
    private int|string|null $tenantId = null;

    /**
     * The resolved tenant subdomain label (routing slug), for logging/cache
     * prefixes and diagnostics. Never used as the security discriminator — the
     * surrogate `tenantId` is (ADR-001 open question: surrogate is stable).
     */
    private ?string $subdomain = null;

    /**
     * The resolved tenant record (B1-01 `Tenant` model) when available. Kept as
     * a loose object so B1-05 does not hard-depend on B1-01's class existing in
     * this worktree (parallel wave-1 task). Consumers that need typed access use
     * the model directly once B1-01 lands.
     */
    private ?object $tenant = null;

    /**
     * Bind the resolved tenant into the context. Called exactly once per request
     * by ResolveTenant after a successful, status-gated lookup.
     */
    public function setTenant(int|string $tenantId, string $subdomain, ?object $tenant = null): void
    {
        $this->tenantId = $tenantId;
        $this->subdomain = $subdomain;
        $this->tenant = $tenant;
    }

    /**
     * True when a tenant has been resolved for this request.
     */
    public function hasTenant(): bool
    {
        return $this->tenantId !== null;
    }

    /**
     * The resolved tenant id, or null when none is resolved.
     *
     * Prefer requireTenantId() in tenant-scoped code paths so a missing tenant
     * fails closed rather than silently widening a query.
     */
    public function tenantId(): int|string|null
    {
        return $this->tenantId;
    }

    /**
     * The resolved tenant id, or throw if none is resolved.
     *
     * This is the fail-closed accessor: tenant-scoped consumers (global scope,
     * guards, cache keys) call this so the ABSENCE of a tenant is an error, not
     * an accidental cross-tenant query.
     */
    public function requireTenantId(): int|string
    {
        if ($this->tenantId === null) {
            throw new TenantResolutionException(
                'No tenant resolved for this request (fail-closed).'
            );
        }

        return $this->tenantId;
    }

    /**
     * The resolved subdomain label, or null when none is resolved.
     */
    public function subdomain(): ?string
    {
        return $this->subdomain;
    }

    /**
     * The resolved tenant record, or null. Loosely typed — see property note.
     */
    public function tenant(): ?object
    {
        return $this->tenant;
    }

    /**
     * Clear the context. Defensive reset for long-lived workers (Octane) so a
     * tenant can never bleed from one request into the next.
     */
    public function reset(): void
    {
        $this->tenantId = null;
        $this->subdomain = null;
        $this->tenant = null;
    }
}
