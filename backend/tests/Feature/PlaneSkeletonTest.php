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
 *  - both plane middleware groups (`tenant`, `platform`) FAIL CLOSED: a route placed
 *    in either group is denied until its guard lets it through. The platform group
 *    still uses the DenyByDefault placeholder (401); the tenant group (B1-07) runs
 *    host/tenant resolution (fail-closed, 400) + the tenant-audience auth gate (401).
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
        // Register a throwaway route behind the `tenant` group and assert it is
        // denied. In B1-07 the tenant group's DenyByDefault placeholder is
        // replaced by host/tenant resolution (fail-closed) + the tenant-audience
        // auth gate. A request with no resolvable tenant host and no valid token
        // is still DENIED — it fails closed BEFORE the handler. The exact code is
        // 400 (tenant_required: no tenant could be resolved from the host) rather
        // than 401, but the guarantee is unchanged: a tenant-group route never
        // reaches its handler without a resolved tenant + valid tenant token.
        Route::middleware('tenant')->get('/__b1_00_tenant_probe', fn () => response()->json(['ok' => true]));

        $response = $this->getJson('/__b1_00_tenant_probe');

        // Denied by default (fail-closed): never 200. Resolution runs first, so a
        // tenantless request is rejected with 400 tenant_required.
        $this->assertContains($response->getStatusCode(), [400, 401]);
        $this->assertNotSame(200, $response->getStatusCode());
        $response->assertJsonPath('error.code', 'tenant_required');
    }

    public function test_platform_middleware_group_denies_by_default(): void
    {
        Route::middleware('platform')->get('/__b1_00_platform_probe', fn () => response()->json(['ok' => true]));

        $this->getJson('/__b1_00_platform_probe')
            ->assertStatus(401)
            ->assertJson(['error' => ['code' => 'unauthenticated']]);
    }

    public function test_both_plane_groups_fail_closed(): void
    {
        // The authoritative groups live in bootstrap/app.php; the Kernel mirror
        // documents them for discoverability. The `platform` group still uses the
        // DenyByDefault placeholder; the `tenant` group was replaced in B1-07 by
        // host/tenant resolution + the tenant-audience auth gate. Assert neither
        // can silently fail open.
        $groups = \App\Http\Kernel::PLANE_MIDDLEWARE_GROUPS;

        // Platform plane: still the deny-by-default placeholder (B1-03 pending).
        $this->assertContains(DenyByDefault::class, $groups['platform']);

        // Tenant plane: fail-closed resolution + tenant-audience gate (B1-07).
        $this->assertContains(\App\Http\Middleware\ResolveTenant::class, $groups['tenant']);
        $this->assertContains(\App\Http\Middleware\EnsureTenantAudience::class, $groups['tenant']);
        $this->assertNotContains(DenyByDefault::class, $groups['tenant']);
    }
}
