<?php

namespace Tests\Feature\Platform\Sec1;

use App\Platform\PlatformAuthorizer;
use App\Platform\PlatformRole;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 5: platform.* ∩ tenant.* = ∅.
 * --------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.5; ADR-007 §3). The authorization
 * namespaces of the two planes are provably disjoint: no permission a platform
 * role can hold is ever a tenant permission, and vice versa. This holds
 * structurally (every platform permission is prefixed `platform.`, every tenant
 * permission `tenant.`) and is asserted both as a set-intersection and over the
 * full role→permission map.
 *
 * Pure unit-style assertions; no DB, no cloud calls.
 */
final class PermissionNamespaceDisjointnessTest extends TestCase
{
    public function test_platform_and_tenant_catalogs_are_disjoint(): void
    {
        $intersection = array_intersect(
            PlatformAuthorizer::PLATFORM_PERMISSION_CATALOG,
            PlatformAuthorizer::TENANT_PERMISSION_CATALOG,
        );

        $this->assertSame([], $intersection, 'platform.* ∩ tenant.* must be empty.');
        $this->assertTrue(PlatformAuthorizer::namespacesAreDisjoint());
    }

    public function test_every_platform_permission_is_in_the_platform_namespace(): void
    {
        foreach (PlatformAuthorizer::PLATFORM_PERMISSION_CATALOG as $permission) {
            $this->assertStringStartsWith('platform.', $permission,
                "Platform permission '{$permission}' must live in the platform.* namespace.");
            $this->assertStringStartsNotWith('tenant.', $permission);
        }
    }

    public function test_every_tenant_permission_is_in_the_tenant_namespace(): void
    {
        foreach (PlatformAuthorizer::TENANT_PERMISSION_CATALOG as $permission) {
            $this->assertStringStartsWith('tenant.', $permission,
                "Tenant permission '{$permission}' must live in the tenant.* namespace.");
            $this->assertStringStartsNotWith('platform.', $permission);
        }
    }

    public function test_no_platform_role_grants_any_tenant_permission(): void
    {
        $authorizer = new PlatformAuthorizer;

        foreach (PlatformRole::all() as $role) {
            $granted = $authorizer->permissionsFor($role);

            foreach ($granted as $permission) {
                $this->assertStringStartsWith('platform.', $permission,
                    "Role {$role->value} must only grant platform.* permissions, got '{$permission}'.");
            }

            // Explicitly: none of the tenant catalog leaks into any role grant.
            $leaked = array_intersect($granted, PlatformAuthorizer::TENANT_PERMISSION_CATALOG);
            $this->assertSame([], $leaked,
                "Role {$role->value} must not grant any tenant.* permission.");
        }
    }

    public function test_authorizer_denies_a_tenant_permission_to_the_super_admin(): void
    {
        $authorizer = new PlatformAuthorizer;

        // Even the most privileged platform role cannot hold a tenant permission.
        $this->assertFalse(
            $authorizer->roleCan(PlatformRole::PLATFORM_SUPER_ADMIN, 'tenant.payroll.manage'),
            'A platform role must never be authorized for a tenant.* permission.'
        );
    }
}
