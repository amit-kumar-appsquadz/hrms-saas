<?php

namespace Tests\Feature\Tenancy;

use App\Auth\TokenAudience;
use App\Http\Middleware\EnsureTenantAudience;
use App\Models\Tenant\TenantUser;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * B1-07 — EnsureTenantAudience middleware, HTTP-level (ADR-007 §1, §3).
 *
 * Proves the tenant-audience gate at the request boundary: a platform-audience
 * token is rejected (401) on a tenant endpoint, and a valid tenant-audience
 * token for the resolved tenant is accepted (200). The platform-token-on-tenant-
 * endpoint rejection acceptance is proved here.
 *
 * This test binds the TenantContext directly (as ResolveTenant/B1-05 would after
 * a host lookup) so it does NOT depend on B1-01's `tenants` table, which is a
 * parallel wave-1 task not present in this worktree. It defines a throwaway
 * route behind ONLY the tenant-audience gate to isolate the middleware under
 * test from host resolution.
 */
class TenantAudienceMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private const TENANT_A = 101;

    protected function setUp(): void
    {
        parent::setUp();

        // Bind a resolved tenant into the request-scoped context, as the
        // ResolveTenant middleware would do on a real tenant host.
        $context = $this->app->make(TenantContext::class);
        $context->setTenant(self::TENANT_A, 'acme');

        // A route guarded ONLY by the tenant-audience gate (resolution already
        // simulated above), so this test exercises EnsureTenantAudience + the
        // tenant guard without the B1-01 tenants-table dependency.
        Route::middleware(['api', EnsureTenantAudience::class])
            ->get('/api/v1/_probe-mw', function () {
                return response()->json([
                    'user_id' => Auth::guard('tenant')->id(),
                ]);
            });
    }

    public function test_valid_tenant_token_is_accepted_on_a_tenant_endpoint(): void
    {
        $user = TenantUser::factory()->forTenant(self::TENANT_A)->create();
        $token = TokenAudience::TENANT->issueToken($user->id, ['tid' => self::TENANT_A]);

        $this->withToken($token)
            ->getJson('/api/v1/_probe-mw')
            ->assertOk()
            ->assertJson(['user_id' => $user->id]);
    }

    public function test_platform_token_is_rejected_on_a_tenant_endpoint(): void
    {
        $user = TenantUser::factory()->forTenant(self::TENANT_A)->create();
        // A platform-audience token presented to a tenant endpoint.
        $token = TokenAudience::PLATFORM->issueToken($user->id, ['tid' => self::TENANT_A]);

        $this->withToken($token)
            ->getJson('/api/v1/_probe-mw')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_missing_token_is_rejected_on_a_tenant_endpoint(): void
    {
        $this->getJson('/api/v1/_probe-mw')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'unauthenticated');
    }
}
