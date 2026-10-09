<?php

namespace Tests\Unit\Tenancy;

use App\Tenancy\TenantConnectionResolver;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * B1-05 — TenantConnectionResolver seam (ADR-001 "Preserved seam for dedicated
 * DB"). Phase 1: ALWAYS the shared connection, regardless of tenant/placement.
 */
class TenantConnectionResolverTest extends TestCase
{
    public function test_phase1_returns_shared_connection_for_any_tenant(): void
    {
        Config::set('database.default', 'mysql');
        $resolver = new TenantConnectionResolver;

        $this->assertSame('mysql', $resolver->connectionFor(null));
        $this->assertSame('mysql', $resolver->connectionFor((object) ['db_connection' => null]));
    }

    public function test_phase1_ignores_a_set_placement_column(): void
    {
        Config::set('database.default', 'mysql');
        $resolver = new TenantConnectionResolver;

        // Even if a future placement value is present, Phase 1 stays shared
        // because no dedicated connections are wired yet.
        $tenant = (object) ['db_connection' => 'tenant_dedicated_01'];
        $this->assertSame('mysql', $resolver->connectionFor($tenant));
    }

    public function test_placement_accessor_reads_nullable_column(): void
    {
        $resolver = new TenantConnectionResolver;

        $this->assertNull($resolver->placementFor(null));
        $this->assertNull($resolver->placementFor((object) ['db_connection' => null]));
        $this->assertNull($resolver->placementFor((object) ['db_connection' => '']));
        $this->assertSame('ded_01', $resolver->placementFor((object) ['db_connection' => 'ded_01']));
    }

    public function test_shared_connection_follows_app_default(): void
    {
        Config::set('database.default', 'sqlite');
        $resolver = new TenantConnectionResolver;

        $this->assertSame('sqlite', $resolver->sharedConnection());
    }
}
