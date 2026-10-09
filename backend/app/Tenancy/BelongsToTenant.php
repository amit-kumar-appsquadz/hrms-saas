<?php

namespace App\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * BelongsToTenant (B1-06) — the tenant isolation mechanism.
 * ---------------------------------------------------------
 * Trait applied to EVERY tenant-owned Eloquent model (ADR-001 "Mandatory global
 * scope"). It does three things:
 *
 *   1. Adds a global scope that filters every query by the CURRENT tenant's
 *      `tenant_id` (read from {@see TenantContext}).
 *   2. Auto-fills `tenant_id` on insert from the current tenant, so application
 *      code never has to (and cannot forget to) set it.
 *   3. Exposes a tenant-prefixed cache key helper (`t:{tenant_id}:...`) so model
 *      caches cannot leak across tenants (ADR-001 "Tenant-prefixed cache keys").
 *
 * SECURITY — THIS TRAIT IS THE ISOLATION BOUNDARY.
 * A missing or bypassed scope is a cross-tenant data leak (ADR-001 consequences,
 * steering rule 2). Two deliberate design choices make the trait fail CLOSED:
 *
 *   - FAIL-CLOSED SCOPE: the global scope resolves the tenant via
 *     {@see TenantContext::requireTenantId()}, which THROWS when no tenant is
 *     resolved. We do NOT fall back to "no WHERE clause" (which would return
 *     every tenant's rows) and we do NOT silently scope to null. "No tenant =
 *     all rows" is explicitly forbidden; "no tenant" is an error.
 *
 *   - FAIL-CLOSED INSERT: creating a row without a resolved tenant also throws,
 *     so a row can never be written with a NULL/absent `tenant_id` that would
 *     then be visible (or invisible) to the wrong tenant.
 *
 * SCOPE BYPASS — explicit, documented, tested (steering rule 2).
 * The ONLY sanctioned way to run a query across tenants is the explicit
 * {@see BelongsToTenant::withoutTenantScope()} helper (a thin, named wrapper
 * over Eloquent's `withoutGlobalScope`). Every call site MUST carry an inline
 * comment explaining why it is safe, and MUST be covered by a dedicated test
 * (ADR-001 "explicit, audited bypass path, never ad hoc"). Using the named
 * helper — rather than scattering raw `withoutGlobalScope()` calls — makes
 * bypasses greppable and reviewable in the security review.
 */
trait BelongsToTenant
{
    /**
     * Boot the trait: register the global scope and the auto-fill-on-create
     * hook. Eloquent calls `boot{TraitName}` automatically.
     */
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model): void {
            // Auto-fill tenant_id from the resolved tenant. requireTenantId()
            // FAILS CLOSED: inserting outside a tenant context throws rather than
            // writing a tenant-less (NULL) row.
            $context = app(TenantContext::class);
            $column = static::tenantIdColumn();

            // Respect an explicitly set tenant_id ONLY when it matches the
            // current tenant; a mismatch is an attempt to write into another
            // tenant and is refused. In the common path the column is unset and
            // we fill it from context.
            $currentTenantId = $context->requireTenantId();

            if ($model->getAttribute($column) === null) {
                $model->setAttribute($column, $currentTenantId);

                return;
            }

            if ((string) $model->getAttribute($column) !== (string) $currentTenantId) {
                throw new TenantResolutionException(
                    'Refusing to persist a row for a tenant other than the current '
                    .'tenant (attempted cross-tenant write).'
                );
            }
        });
    }

    /**
     * The column holding the tenant discriminator. Overridable per-model but
     * defaults to `tenant_id` (ADR-001: every tenant-owned table carries a
     * non-null `tenant_id`).
     */
    public static function tenantIdColumn(): string
    {
        return 'tenant_id';
    }

    /**
     * Query the model WITHOUT the tenant global scope — the single sanctioned
     * cross-tenant bypass (steering rule 2 / ADR-001 "explicit, audited bypass
     * path").
     *
     * DANGER: this returns rows across ALL tenants. Every call site MUST:
     *   1. carry an inline comment justifying why crossing tenants is correct
     *      and safe here (e.g. a platform-plane maintenance job), and
     *   2. be covered by a dedicated test.
     *
     * It is intentionally a NAMED method (not a raw `withoutGlobalScope` call
     * sprinkled around the codebase) so every bypass is greppable
     * (`withoutTenantScope`) and auditable in the SEC review. There is NO
     * implicit bypass anywhere else: absent this call, the scope always applies.
     */
    public static function withoutTenantScope(): Builder
    {
        return static::withoutGlobalScope(TenantScope::class);
    }

    /**
     * Tenant-prefixed cache key for this model instance / logical key
     * (`t:{tenant_id}:{key}`). Delegates to {@see TenantCacheKey}, which FAILS
     * CLOSED when no tenant is resolved, so a cache key can never be shared
     * across tenants (ADR-001 "Tenant-prefixed cache keys").
     */
    public function tenantCacheKey(string $key): string
    {
        return app(TenantCacheKey::class)->key($key);
    }

    /**
     * Convenience: the tenant id currently on the model (after auto-fill), or
     * null before it is set.
     */
    public function tenantId(): int|string|null
    {
        return $this->getAttribute(static::tenantIdColumn());
    }
}
