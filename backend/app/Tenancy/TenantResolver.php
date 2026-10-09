<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * TenantResolver (B1-05)
 * ----------------------
 * The tenant LOOKUP seam. Given a validated subdomain label, it returns the
 * matching tenant record from the `tenants` table (owned by B1-01) or null.
 *
 * INTEGRATION ASSUMPTION (parallel wave-1 dependency, per task brief):
 *   This task reads tenant status from the `tenants` table that B1-01 creates in
 *   the SAME wave. B1-05 must NOT redefine the tenants migration/model. We code
 *   against the `App\Models\Tenant` model / `tenants` table BY NAME. If neither
 *   is present in this worktree (B1-01 not merged yet), lookups return null and
 *   the resolver fails closed — exactly the safe behaviour. The guards below are
 *   the "small guard/interface seam" the brief asks for; remove nothing when
 *   B1-01 lands — the model simply becomes resolvable and lookups start working.
 *
 * Lookup is BY SUBDOMAIN using a single indexed query (B1-01 provides
 * UNIQUE(subdomain)); no N+1, no enumeration side-channel — a miss and a
 * non-serveable status are reported identically to the caller (non-enumerating),
 * which is the middleware's job to surface.
 */
class TenantResolver
{
    /**
     * The platform-owned tenant model class (B1-01). Referenced by name so this
     * file carries no compile-time dependency on B1-01's class.
     *
     * @var class-string
     */
    private const TENANT_MODEL = Tenant::class;

    /**
     * Find a tenant by its subdomain label, or null if none / unavailable.
     *
     * Returns a loosely-typed object (the Eloquent model instance when B1-01 is
     * present). The caller only reads `id`, `subdomain`, `status`, and the
     * placement column — all stable B1-01 columns.
     */
    public function findBySubdomain(string $subdomain): ?object
    {
        if (! $this->tenantsTableAvailable()) {
            // B1-01 not present in this worktree: fail closed (no tenant).
            return null;
        }

        /** @var class-string<Model> $model */
        $model = self::TENANT_MODEL;

        // Single indexed lookup on UNIQUE(subdomain). No scope bypass needed —
        // `tenants` is platform-owned and carries no tenant global scope.
        return $model::query()
            ->where('subdomain', $subdomain)
            ->first();
    }

    /**
     * Whether the `Tenant` model class and `tenants` table are both available.
     * Guards the parallel-wave dependency without duplicating B1-01's schema.
     */
    public function tenantsTableAvailable(): bool
    {
        if (! class_exists(self::TENANT_MODEL)) {
            return false;
        }

        try {
            return Schema::hasTable('tenants');
        } catch (\Throwable) {
            // No DB connection / schema introspection failure -> fail closed.
            return false;
        }
    }
}
