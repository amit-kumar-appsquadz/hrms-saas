<?php

namespace Tests\Feature\Platform\Sec1;

use App\Auth\TokenAudience;
use App\Http\Middleware\EnsureTenantAudience;
use App\Models\Platform\PlatformUser;
use App\Models\Tenant\TenantUser;
use App\Platform\PlatformRole;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 2: token-audience isolation BOTH directions
 * ----------------------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.2; ADR-007 §1, §3). The plane boundary is
 * a SERVER-SIDE audience claim, independent of path/host. This suite proves,
 * end-to-end through the real middleware stack:
 *
 *   (a) a `platform`-audience token is REJECTED on a tenant endpoint, and
 *   (b) a `tenant`-audience token is REJECTED on a platform endpoint.
 *
 * Both directions are asserted so the harness is complete, not just one way.
 *
 * The tenant side binds TenantContext directly (as ResolveTenant/B1-05 would
 * after a host lookup) and mounts a route behind ONLY the tenant-audience gate,
 * so this evidence does not depend on B1-01's `tenants` table. The platform side
 * uses the real `/api/v1/platform/_probe` route behind the platform group.
 *
 * Deterministic + no cloud calls (sqlite :memory:, HMAC token over APP_KEY).
 */
final class TokenAudienceIsolationTest extends TestCase
{
    use RefreshDatabase;

    private const TENANT_A = 101;

    protected function setUp(): void
    {
        parent::setUp();

        // Simulate a resolved tenant for the tenant-side endpoint.
        $this->app->make(TenantContext::class)->setTenant(self::TENANT_A, 'acme');

        // A tenant endpoint guarded ONLY by the tenant-audience gate (host
        // resolution already simulated above).
        Route::middleware(['api', EnsureTenantAudience::class])
            ->get('/api/v1/_sec1-tenant-probe', function () {
                return response()->json(['user_id' => Auth::guard('tenant')->id()]);
            });
    }

    // --- Direction A: platform token on a TENANT endpoint is rejected --------

    public function test_platform_token_is_rejected_on_a_tenant_endpoint(): void
    {
        $tenantUser = TenantUser::factory()->forTenant(self::TENANT_A)->create();

        // A correctly-signed PLATFORM-audience token presented to a tenant route.
        $token = TokenAudience::PLATFORM->issueToken($tenantUser->id, ['tid' => self::TENANT_A]);

        $this->withToken($token)
            ->getJson('/api/v1/_sec1-tenant-probe')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_valid_tenant_token_is_accepted_on_a_tenant_endpoint(): void
    {
        // Positive control: the SAME subject with the correct audience is OK, so
        // the rejection above is attributable to the audience, nothing else.
        $tenantUser = TenantUser::factory()->forTenant(self::TENANT_A)->create();
        $token = TokenAudience::TENANT->issueToken($tenantUser->id, ['tid' => self::TENANT_A]);

        $this->withToken($token)
            ->getJson('/api/v1/_sec1-tenant-probe')
            ->assertOk()
            ->assertJson(['user_id' => $tenantUser->id]);
    }

    // --- Direction B: tenant token on a PLATFORM endpoint is rejected --------

    public function test_tenant_token_is_rejected_on_a_platform_endpoint(): void
    {
        $platformUser = PlatformUser::factory()->create([
            'platform_role' => PlatformRole::PLATFORM_SUPER_ADMIN->value,
        ]);

        // A correctly-signed TENANT-audience token presented to a platform route.
        $token = TokenAudience::TENANT->issueToken($platformUser->id);

        $this->withToken($token)
            ->getJson('/api/v1/platform/_probe')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_valid_platform_token_is_accepted_on_a_platform_endpoint(): void
    {
        // Positive control for direction B: the same subject with the correct
        // audience (and a role that grants platform.dashboard.view) is accepted.
        $platformUser = PlatformUser::factory()->create([
            'platform_role' => PlatformRole::PLATFORM_SUPER_ADMIN->value,
        ]);

        $token = TokenAudience::PLATFORM->issueToken($platformUser->id);

        $this->withToken($token)
            ->getJson('/api/v1/platform/_probe')
            ->assertOk()
            ->assertJsonPath('plane', 'platform');
    }

    public function test_missing_token_is_rejected_on_both_planes(): void
    {
        $this->getJson('/api/v1/_sec1-tenant-probe')->assertUnauthorized();
        $this->getJson('/api/v1/platform/_probe')->assertUnauthorized();
    }
}
