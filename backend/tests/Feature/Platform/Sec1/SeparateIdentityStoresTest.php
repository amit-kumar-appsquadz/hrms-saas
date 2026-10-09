<?php

namespace Tests\Feature\Platform\Sec1;

use App\Auth\PlatformGuard;
use App\Auth\TenantGuard;
use App\Auth\TokenAudience;
use App\Models\Platform\PlatformUser;
use App\Models\Tenant\TenantUser;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 3: separate identity stores (no universal user).
 * ---------------------------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.3; ADR-007 §1, §8). Proves the two planes
 * use physically separate identity stores and that neither guard can resolve the
 * other plane's identity:
 *
 *   - a tenant user cannot authenticate via the PLATFORM guard (wrong store);
 *   - a platform user cannot authenticate via the TENANT guard (wrong store);
 *   - the two stores are distinct tables with no shared/universal user table.
 *
 * Deterministic + no cloud calls (sqlite :memory:).
 */
final class SeparateIdentityStoresTest extends TestCase
{
    use RefreshDatabase;

    private const TENANT_A = 101;

    private function platformGuardWithToken(?string $token): PlatformGuard
    {
        $request = Request::create('/api/v1/platform/_probe', 'GET');
        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        return new PlatformGuard(Auth::createUserProvider('platform_users'), $request);
    }

    private function tenantGuardWithToken(?string $token, int $tenantId): TenantGuard
    {
        $request = Request::create('/api/v1/_probe', 'GET');
        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        $context = $this->app->make(TenantContext::class);
        $context->reset();
        $context->setTenant($tenantId, 'acme');

        return new TenantGuard(Auth::createUserProvider('tenant_users'), $request, $context);
    }

    public function test_a_tenant_user_cannot_authenticate_via_the_platform_guard(): void
    {
        $tenantUser = TenantUser::factory()->forTenant(self::TENANT_A)->create();

        // No platform_users row shares that id — the stores are disjoint.
        $this->assertNull(PlatformUser::find($tenantUser->id));

        // Even a correctly-signed platform-audience token whose subject is the
        // tenant user's id resolves to NO platform_user -> rejected.
        $token = TokenAudience::PLATFORM->issueToken($tenantUser->id);
        $guard = $this->platformGuardWithToken($token);

        $this->assertFalse($guard->check(), 'A tenant user must not authenticate on the platform plane.');
        $this->assertNull($guard->user());
    }

    public function test_a_platform_user_cannot_authenticate_via_the_tenant_guard(): void
    {
        $platformUser = PlatformUser::factory()->create();

        // No tenant users row shares that id in tenant A.
        $this->assertNull(TenantUser::query()->whereKey($platformUser->id)->first());

        // A correctly-signed tenant-audience token whose subject is the platform
        // user's id resolves to NO tenant user within tenant A -> rejected.
        $token = TokenAudience::TENANT->issueToken($platformUser->id, ['tid' => self::TENANT_A]);
        $guard = $this->tenantGuardWithToken($token, self::TENANT_A);

        $this->assertFalse($guard->check(), 'A platform user must not authenticate on the tenant plane.');
        $this->assertNull($guard->user());
    }

    public function test_identity_stores_are_physically_separate_tables(): void
    {
        $this->assertTrue(Schema::hasTable('platform_users'));
        $this->assertTrue(Schema::hasTable('users'));

        $this->assertSame('platform_users', (new PlatformUser)->getTable());
        $this->assertSame('users', (new TenantUser)->getTable());
        $this->assertNotSame((new PlatformUser)->getTable(), (new TenantUser)->getTable());
    }

    public function test_no_shared_or_universal_user_table_exists(): void
    {
        foreach (['platform_tenant_users', 'universal_users', 'all_users', 'identities'] as $forbidden) {
            $this->assertFalse(
                Schema::hasTable($forbidden),
                "A shared/universal user table ({$forbidden}) is forbidden (ADR-007 §1, §8)."
            );
        }

        // No cross-plane FK columns linking the two identity stores.
        $this->assertFalse(Schema::hasColumn('platform_users', 'tenant_id'));
        $this->assertFalse(Schema::hasColumn('platform_users', 'user_id'));
        $this->assertFalse(Schema::hasColumn('users', 'platform_user_id'));
    }

    public function test_same_email_in_both_planes_is_two_independent_rows(): void
    {
        $email = 'dual@identity.test';

        TenantUser::factory()->forTenant(self::TENANT_A)->create(['email' => $email]);
        PlatformUser::factory()->create(['email' => $email]);

        $this->assertDatabaseHas('users', ['email' => $email]);
        $this->assertDatabaseHas('platform_users', ['email' => $email]);

        // They are NOT the same identity: distinct tables, distinct ids/scopes.
        $tenantRow = TenantUser::query()->where('email', $email)->first();
        $platformRow = PlatformUser::query()->where('email', $email)->first();

        $this->assertNotNull($tenantRow);
        $this->assertNotNull($platformRow);
        $this->assertSame(self::TENANT_A, (int) $tenantRow->tenant_id);
        $this->assertFalse(Schema::hasColumn('platform_users', 'tenant_id'));
    }
}
