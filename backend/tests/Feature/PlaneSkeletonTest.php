<?php

namespace Tests\Feature;

use App\Http\Middleware\DenyByDefault;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * B1-00 smoke test for the two-plane route skeleton.
 *
 * Proves:
 *  - both plane health routes resolve and return 200 (the only intentionally-open routes);
 *  - the two health routes are distinct routes on distinct namespaces/handlers;
 *  - both plane middleware groups (`tenant`, `platform`) exist and DENY BY DEFAULT,
 *    i.e. a route placed in either group is rejected 401 until the real guard lands.
 */
class PlaneSkeletonTest extends TestCase
{
    public function test_tenant_plane_health_returns_200(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJson(['status' => 'ok', 'plane' => 'tenant']);
    }

    public function test_platform_plane_health_returns_200(): void
    {
        $this->getJson('/api/v1/platform/health')
            ->assertOk()
            ->assertJson(['status' => 'ok', 'plane' => 'platform']);
    }

    public function test_the_two_health_routes_are_distinct_registered_routes(): void
    {
        $tenant = Route::getRoutes()->getByName('tenant.health');
        $platform = Route::getRoutes()->getByName('platform.health');

        $this->assertNotNull($tenant, 'tenant.health route must be registered');
        $this->assertNotNull($platform, 'platform.health route must be registered');

        $this->assertSame('api/v1/health', $tenant->uri());
        $this->assertSame('api/v1/platform/health', $platform->uri());
        $this->assertNotSame($tenant->uri(), $platform->uri());
    }

    public function test_tenant_middleware_group_denies_by_default(): void
    {
        // Register a throwaway route behind the `tenant` group and assert it is denied.
        Route::middleware('tenant')->get('/__b1_00_tenant_probe', fn () => response()->json(['ok' => true]));

        $this->getJson('/__b1_00_tenant_probe')
            ->assertStatus(401)
            ->assertJson(['error' => ['code' => 'unauthenticated']]);
    }

    public function test_platform_middleware_group_denies_by_default(): void
    {
        Route::middleware('platform')->get('/__b1_00_platform_probe', fn () => response()->json(['ok' => true]));

        $this->getJson('/__b1_00_platform_probe')
            ->assertStatus(401)
            ->assertJson(['error' => ['code' => 'unauthenticated']]);
    }

    public function test_both_plane_groups_use_the_deny_by_default_placeholder(): void
    {
        // The authoritative groups live in bootstrap/app.php; the Kernel mirror
        // documents them for discoverability. Assert both reference DenyByDefault
        // so a future change cannot silently make a plane fail open.
        $groups = \App\Http\Kernel::PLANE_MIDDLEWARE_GROUPS;

        $this->assertContains(DenyByDefault::class, $groups['tenant']);
        $this->assertContains(DenyByDefault::class, $groups['platform']);
    }
}
