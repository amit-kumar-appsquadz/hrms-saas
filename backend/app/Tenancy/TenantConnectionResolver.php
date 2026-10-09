<?php

namespace App\Tenancy;

/**
 * TenantConnectionResolver (B1-05, ADR-001 "Preserved seam for dedicated DB")
 * ---------------------------------------------------------------------------
 * The single abstraction through which tenant -> database connection resolution
 * flows. ADR-001 decided: shared database, shared schema, discriminator column
 * in Phase 1, with a preserved seam so a few large/regulated enterprise tenants
 * can later be routed to a dedicated database WITHOUT touching call sites.
 *
 * PHASE 1 BEHAVIOUR (fixed): this resolver ALWAYS returns the shared/default
 * connection, regardless of tenant. No dedicated databases exist yet.
 *
 * THE PLACEMENT SEAM: the `tenants` table carries a nullable `db_connection`
 * (placement) column (owned by B1-01). This resolver READS that column so the
 * routing logic lives in one place from day one:
 *   - `db_connection` is null (the only Phase-1 value)  -> shared connection.
 *   - `db_connection` is set (future, enterprise)        -> that named
 *     connection, once such connections are configured.
 *
 * In Phase 1 the method short-circuits to the shared connection even if a
 * placement value were present, because no dedicated connections are wired in
 * `config/database.php` yet. The branch is kept visible (and tested) so the
 * extension point is real, not notional. Flipping to real dedicated routing is
 * a config + single-method change here — never a change at the call sites.
 *
 * This resolver is deliberately NOT a security boundary: isolation is the
 * `tenant_id` discriminator + global scope (ADR-001). Even a dedicated-DB tenant
 * keeps `tenant_id` and the global scope.
 */
class TenantConnectionResolver
{
    /**
     * Phase-1 flag. When false (Phase 1), always return the shared connection
     * regardless of placement. Flipping this to true is part of the FUTURE work
     * that also wires dedicated connections into config/database.php.
     */
    private bool $dedicatedPlacementEnabled = false;

    /**
     * Resolve the database connection name to use for the given tenant.
     *
     * @param  object|null  $tenant  The resolved tenant record (B1-01 `Tenant`
     *                               model) or null. Loosely typed so B1-05 does
     *                               not hard-depend on B1-01's class in this
     *                               parallel-wave worktree.
     * @return string|null The connection name, or null meaning "use the
     *                     application default/shared connection".
     */
    public function connectionFor(?object $tenant): ?string
    {
        // Phase 1: shared database, shared schema (ADR-001). Always shared.
        if (! $this->dedicatedPlacementEnabled) {
            return $this->sharedConnection();
        }

        // --- FUTURE (enterprise dedicated DB), kept as the single seam ------
        // Read the nullable placement column from the tenant record. A null /
        // missing value means the tenant lives on the shared connection.
        $placement = $this->placementFor($tenant);

        return $placement ?? $this->sharedConnection();
    }

    /**
     * The shared/default connection name. Returning the application's configured
     * default keeps call sites agnostic to the concrete driver (sqlite in tests,
     * MySQL/RDS in prod).
     */
    public function sharedConnection(): ?string
    {
        return config('database.default');
    }

    /**
     * Read the nullable `db_connection` placement column from a tenant record,
     * defensively (the column is owned by B1-01). Returns null when the tenant
     * is null, the column is absent, or the value is empty.
     *
     * Exposed for the extension point and its test; not used in Phase-1 routing.
     */
    public function placementFor(?object $tenant): ?string
    {
        if ($tenant === null) {
            return null;
        }

        // Prefer an accessor if the model exposes one; fall back to attribute.
        $value = $tenant->db_connection ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }
}
