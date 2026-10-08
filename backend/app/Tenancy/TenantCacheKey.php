<?php

namespace App\Tenancy;

/**
 * TenantCacheKey (B1-06)
 * ----------------------
 * Builds tenant-prefixed cache keys so cache entries can NEVER leak across
 * tenants (ADR-001 "Tenant-prefixed cache keys": all keys are prefixed with the
 * tenant identifier `t:{tenant_id}:...`).
 *
 * The prefix is derived from the SURROGATE `tenant_id` resolved into
 * {@see TenantContext} — not the subdomain slug — because ADR-001 (open
 * question, resolved) requires a stable identifier that is never reused. The
 * subdomain is a routing label and could in principle be re-pointed; the
 * surrogate id is the security discriminator everywhere else (global scope,
 * audit), so cache keys use it too for consistency.
 *
 * FAIL-CLOSED: like the global scope, this helper calls
 * {@see TenantContext::requireTenantId()}. If no tenant is resolved, building a
 * tenant-scoped cache key THROWS rather than producing an un-prefixed (and
 * therefore cross-tenant-shared) key. A missing prefix would let two tenants
 * collide on the same key — a cache-level cross-tenant leak — so absence is an
 * error, never a silent global key.
 */
class TenantCacheKey
{
    public function __construct(
        private readonly TenantContext $context,
    ) {}

    /**
     * The tenant cache-key prefix for the CURRENT tenant: `t:{tenant_id}:`.
     *
     * @throws TenantResolutionException when no tenant is resolved (fail-closed).
     */
    public function prefix(): string
    {
        return self::prefixFor($this->context->requireTenantId());
    }

    /**
     * Prefix a single logical key with the CURRENT tenant: `t:{tenant_id}:{key}`.
     *
     * @throws TenantResolutionException when no tenant is resolved (fail-closed).
     */
    public function key(string $key): string
    {
        return $this->prefix().$key;
    }

    /**
     * The prefix for an EXPLICIT tenant id. Used by code paths that legitimately
     * operate outside the current request's tenant context (e.g. queued jobs
     * that carry their own tenant id). Callers must have obtained the id through
     * an authorised path; this method does not consult the request context.
     */
    public static function prefixFor(int|string $tenantId): string
    {
        return 't:'.$tenantId.':';
    }

    /**
     * Prefix a key for an EXPLICIT tenant id: `t:{tenant_id}:{key}`.
     */
    public static function keyFor(int|string $tenantId, string $key): string
    {
        return self::prefixFor($tenantId).$key;
    }
}
