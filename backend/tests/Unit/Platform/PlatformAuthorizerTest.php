<?php

namespace Tests\Unit\Platform;

use App\Platform\PlatformAuthorizer;
use App\Platform\PlatformRole;
use PHPUnit\Framework\TestCase;

/**
 * B1-03 — PlatformAuthorizer / PlatformRole unit tests.
 *
 * Covers: the fixed role→permission map (ADR-007 §4, PLATFORM_API_SPEC), the
 * `platform.*` catalog, and the cross-plane disjointness invariant
 * (platform.* ∩ tenant.* = ∅).
 */
class PlatformAuthorizerTest extends TestCase
{
    private PlatformAuthorizer $authorizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authorizer = new PlatformAuthorizer;
    }

    public function test_platform_role_enum_backing_values_match_b1_02_storage(): void
    {
        // Must stay identical to the four strings pinned by B1-02's migration.
        $this->assertSame('PLATFORM_SUPER_ADMIN', PlatformRole::PLATFORM_SUPER_ADMIN->value);
        $this->assertSame('PLATFORM_SUPPORT', PlatformRole::PLATFORM_SUPPORT->value);
        $this->assertSame('PLATFORM_OPERATIONS', PlatformRole::PLATFORM_OPERATIONS->value);
        $this->assertSame('PLATFORM_AUDITOR', PlatformRole::PLATFORM_AUDITOR->value);
        $this->assertCount(4, PlatformRole::cases());
    }

    public function test_super_admin_gets_the_full_platform_catalog(): void
    {
        $perms = $this->authorizer->permissionsFor(PlatformRole::PLATFORM_SUPER_ADMIN);

        $this->assertEqualsCanonicalizing(
            PlatformAuthorizer::PLATFORM_PERMISSION_CATALOG,
            $perms,
        );
    }

    public function test_operations_role_permission_map(): void
    {
        $perms = $this->authorizer->permissionsFor(PlatformRole::PLATFORM_OPERATIONS);

        $this->assertEqualsCanonicalizing([
            'platform.dashboard.view',
            'platform.tenant.view',
            'platform.tenant.create',
            'platform.tenant.edit',
            'platform.tenant.activate',
            'platform.tenant.suspend',
            'platform.tenant.access',
            'platform.audit.view',
            'platform.settings.view',
        ], $perms);

        // Operations is not super-admin: no user-management / settings.manage / billing.
        $this->assertFalse($this->authorizer->roleCan(PlatformRole::PLATFORM_OPERATIONS, 'platform.user.manage'));
        $this->assertFalse($this->authorizer->roleCan(PlatformRole::PLATFORM_OPERATIONS, 'platform.settings.manage'));
        $this->assertFalse($this->authorizer->roleCan(PlatformRole::PLATFORM_OPERATIONS, 'platform.billing.manage'));
    }

    public function test_support_role_permission_map(): void
    {
        $perms = $this->authorizer->permissionsFor(PlatformRole::PLATFORM_SUPPORT);

        $this->assertEqualsCanonicalizing([
            'platform.dashboard.view',
            'platform.tenant.view',
            'platform.tenant.access',
            'platform.audit.view',
        ], $perms);

        $this->assertTrue($this->authorizer->roleCan(PlatformRole::PLATFORM_SUPPORT, 'platform.tenant.access'));
        $this->assertFalse($this->authorizer->roleCan(PlatformRole::PLATFORM_SUPPORT, 'platform.tenant.create'));
    }

    public function test_auditor_role_is_read_only(): void
    {
        $perms = $this->authorizer->permissionsFor(PlatformRole::PLATFORM_AUDITOR);

        $this->assertEqualsCanonicalizing([
            'platform.dashboard.view',
            'platform.tenant.view',
            'platform.audit.view',
            'platform.settings.view',
        ], $perms);

        // No write/manage permission anywhere for the auditor.
        foreach ($perms as $p) {
            $this->assertStringEndsNotWith('.manage', $p);
            $this->assertStringEndsNotWith('.create', $p);
            $this->assertStringEndsNotWith('.edit', $p);
            $this->assertStringEndsNotWith('.suspend', $p);
            $this->assertStringEndsNotWith('.activate', $p);
        }
    }

    public function test_every_role_maps_only_to_platform_permissions(): void
    {
        foreach (PlatformRole::cases() as $role) {
            foreach ($this->authorizer->permissionsFor($role) as $perm) {
                $this->assertStringStartsWith('platform.', $perm,
                    "Role {$role->value} must only carry platform.* permissions");
            }
        }
    }

    public function test_authorizer_carries_no_tenant_permissions(): void
    {
        foreach (PlatformAuthorizer::PLATFORM_PERMISSION_CATALOG as $perm) {
            $this->assertStringStartsWith('platform.', $perm);
            $this->assertStringStartsNotWith('tenant.', $perm);
        }
    }

    public function test_platform_and_tenant_permission_sets_are_disjoint(): void
    {
        // The headline cross-plane invariant: platform.* ∩ tenant.* = ∅ (ADR-007 §3).
        $this->assertTrue(PlatformAuthorizer::namespacesAreDisjoint());

        $intersection = array_intersect(
            PlatformAuthorizer::PLATFORM_PERMISSION_CATALOG,
            PlatformAuthorizer::TENANT_PERMISSION_CATALOG,
        );
        $this->assertSame([], $intersection, 'platform.* and tenant.* must not overlap');

        // And structurally: no platform permission is in the tenant namespace.
        foreach (PlatformAuthorizer::PLATFORM_PERMISSION_CATALOG as $p) {
            $this->assertStringStartsNotWith('tenant.', $p);
        }
        foreach (PlatformAuthorizer::TENANT_PERMISSION_CATALOG as $t) {
            $this->assertStringStartsNotWith('platform.', $t);
        }
    }
}
