<?php

namespace App\Platform;

/**
 * PlatformAuthorizer — the code-mapped authorization service for the PLATFORM
 * plane (ADR-007 §4, approved decision 6; catalog from docs/ui/PLATFORM_API_SPEC.md).
 *
 * Phase 1 authorization is a FIXED role→permission map in code. There is NO
 * `platform_roles` table. Every platform call site asks THIS service for a role's
 * permissions (or whether a role may perform a permission) — never reads the enum
 * directly — so the single extension seam below can later swap the in-code map for
 * a table-backed lookup WITHOUT touching call sites.
 *
 * Namespace invariant (ADR-007 §3): this authorizer carries ONLY `platform.*`
 * permissions. It never returns or references any `tenant.*` permission. The
 * {@see self::TENANT_PERMISSION_CATALOG} constant mirrors the tenant namespace
 * purely so the disjointness invariant (platform.* ∩ tenant.* = ∅) is provable in a
 * unit test from the platform side; it is NOT used for any authorization decision.
 *
 * ── Extension seam (documented, NOT built in B1) ──────────────────────────────
 * To introduce configurable platform RBAC later: replace the body of
 * {@see self::permissionsFor()} with a repository/table lookup keyed by role,
 * seeded from {@see self::ROLE_PERMISSIONS} as the default. Call sites
 * ({@see self::roleCan()}) stay unchanged. No `platform_roles` table is created
 * in Phase 1.
 */
final class PlatformAuthorizer
{
    /**
     * The full `platform.*` permission catalog (docs/ui/PLATFORM_API_SPEC.md,
     * "Platform permission catalog"). This is the authoritative list defined here
     * for B1 (the contract source is the spec/openapi; this mirrors it in code).
     *
     * @var list<string>
     */
    public const PLATFORM_PERMISSION_CATALOG = [
        'platform.dashboard.view',
        'platform.tenant.view',
        'platform.tenant.create',
        'platform.tenant.edit',
        'platform.tenant.activate',
        'platform.tenant.suspend',
        'platform.tenant.access',   // read-only support session (ADR-007 §6)
        'platform.user.view',
        'platform.user.manage',
        'platform.audit.view',
        'platform.settings.view',
        'platform.settings.manage',
        'platform.billing.manage',
    ];

    /**
     * A DECLARED mirror of the tenant permission namespace, used ONLY to assert
     * the cross-plane disjointness invariant (platform.* ∩ tenant.* = ∅) from the
     * platform side. The authoritative tenant catalog lives on the tenant plane
     * (tenant RBAC, B2/B3). This list is intentionally representative of the
     * `tenant.*` namespace and is never consulted for a platform authorization
     * decision. The disjointness guarantee holds structurally regardless of this
     * list's completeness: every entry here is prefixed `tenant.` and every
     * platform permission is prefixed `platform.`, so the two sets can never
     * intersect (see {@see self::namespacesAreDisjoint()}).
     *
     * @var list<string>
     */
    public const TENANT_PERMISSION_CATALOG = [
        'tenant.dashboard.view',
        'tenant.employee.view',
        'tenant.employee.manage',
        'tenant.attendance.view',
        'tenant.attendance.manage',
        'tenant.leave.view',
        'tenant.leave.manage',
        'tenant.payroll.view',
        'tenant.payroll.manage',
        'tenant.settings.view',
        'tenant.settings.manage',
        'tenant.user.view',
        'tenant.user.manage',
        'tenant.audit.view',
    ];

    /**
     * The FIXED Phase-1 role→permission map (docs/ui/PLATFORM_API_SPEC.md,
     * "Fixed role enum → permissions"). SUPER_ADMIN gets the full catalog.
     *
     * @var array<string, list<string>>
     */
    private const ROLE_PERMISSIONS = [
        PlatformRole::PLATFORM_SUPER_ADMIN->value => self::PLATFORM_PERMISSION_CATALOG,

        PlatformRole::PLATFORM_OPERATIONS->value => [
            'platform.dashboard.view',
            'platform.tenant.view',
            'platform.tenant.create',
            'platform.tenant.edit',
            'platform.tenant.activate',
            'platform.tenant.suspend',
            'platform.tenant.access',
            'platform.audit.view',
            'platform.settings.view',
        ],

        PlatformRole::PLATFORM_SUPPORT->value => [
            'platform.dashboard.view',
            'platform.tenant.view',
            'platform.tenant.access',
            'platform.audit.view',
        ],

        PlatformRole::PLATFORM_AUDITOR->value => [
            'platform.dashboard.view',
            'platform.tenant.view',
            'platform.audit.view',
            'platform.settings.view',
        ],
    ];

    /**
     * The fixed `platform.*` permissions granted to a role (Phase-1 code map).
     *
     * Extension seam: swap this body for a table lookup to enable configurable
     * platform RBAC later; the signature and all call sites remain unchanged.
     *
     * @return list<string>
     */
    public function permissionsFor(PlatformRole $role): array
    {
        return self::ROLE_PERMISSIONS[$role->value];
    }

    /**
     * Whether a role is granted a specific permission. This is the method call
     * sites use (via the AuthorizePlatform middleware) — never the raw map.
     */
    public function roleCan(PlatformRole $role, string $permission): bool
    {
        return in_array($permission, $this->permissionsFor($role), true);
    }

    /**
     * The full platform catalog.
     *
     * @return list<string>
     */
    public function catalog(): array
    {
        return self::PLATFORM_PERMISSION_CATALOG;
    }

    /**
     * Structural disjointness check: no `platform.*` permission equals any
     * `tenant.*` permission. Used by the disjointness unit test.
     */
    public static function namespacesAreDisjoint(): bool
    {
        return array_intersect(
            self::PLATFORM_PERMISSION_CATALOG,
            self::TENANT_PERMISSION_CATALOG,
        ) === [];
    }
}
