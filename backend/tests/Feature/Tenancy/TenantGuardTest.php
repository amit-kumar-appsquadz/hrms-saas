<?php

namespace Tests\Feature\Tenancy;

use App\Auth\TenantGuard;
use App\Auth\TokenAudience;
use App\Models\Tenant\TenantUser;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

/**
 * B1-07 — Tenant auth guard + audience + tenant-context boundary
 * (ADR-007 §1, §3).
 *
 * Proves the server-side plane + tenant boundary at the guard layer, without
 * depending on B1-01's `tenants` table (a parallel wave-1 task not present in
 * this worktree): the tenant is bound directly into a TenantContext, exactly as
 * ResolveTenant (B1-05) would after a successful host lookup.
 *
 * Acceptance covered here:
 *   - a `tenant`-audience token authenticates a tenant user WITHIN its tenant;
 *   - a `platform`-audience token is REJECTED by the tenant guard;
 *   - a tenant user from tenant B cannot authenticate into tenant A's context
 *     (cross-tenant rejection);
 *   - fail-closed when no tenant context is resolved.
 */
class TenantGuardTest extends TestCase
{
    use RefreshDatabase;

    private const TENANT_A = 101;
    private const TENANT_B = 202;

    /**
     * Build a TenantGuard whose request carries the given bearer token and whose
     * TenantContext is bound to the given tenant id (or empty when null).
     */
    private function guard(?string $token, int|string|null $tenantId): TenantGuard
    {
        $request = Request::create('/api/v1/_probe', 'GET');
        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        $context = new TenantContext();
        if ($tenantId !== null) {
            $context->setTenant($tenantId, 'tenant-'.$tenantId);
        }

        $provider = Auth::createUserProvider('tenant_users');

        return new TenantGuard($provider, $request, $context);
    }

    private function tenantUser(int|string $tenantId): TenantUser
    {
        return TenantUser::factory()->forTenant($tenantId)->create();
    }

    public function test_tenant_audience_token_authenticates_a_tenant_user_within_its_tenant(): void
    {
        $user = $this->tenantUser(self::TENANT_A);

        $token = TokenAudience::TENANT->issueToken($user->id, ['tid' => self::TENANT_A]);
        $guard = $this->guard($token, self::TENANT_A);

        $this->assertTrue($guard->check());
        $this->assertInstanceOf(TenantUser::class, $guard->user());
        $this->assertSame($user->id, $guard->id());
    }

    public function test_platform_audience_token_is_rejected_by_the_tenant_guard(): void
    {
        $user = $this->tenantUser(self::TENANT_A);

        // Same subject id, but WRONG audience → rejected regardless of path.
        $token = TokenAudience::PLATFORM->issueToken($user->id, ['tid' => self::TENANT_A]);
        $guard = $this->guard($token, self::TENANT_A);

        $this->assertFalse($guard->check());
        $this->assertNull($guard->user());
    }

    public function test_tenant_b_user_cannot_authenticate_into_tenant_a_context(): void
    {
        // A user that belongs to tenant B.
        $userB = $this->tenantUser(self::TENANT_B);

        // Present tenant-B user's id, but the resolved context is tenant A.
        $token = TokenAudience::TENANT->issueToken($userB->id);
        $guard = $this->guard($token, self::TENANT_A);

        $this->assertFalse($guard->check(), 'tenant-B user must not authenticate in tenant-A context');
        $this->assertNull($guard->user());
    }

    public function test_token_tid_claim_mismatch_is_rejected(): void
    {
        $userA = $this->tenantUser(self::TENANT_A);

        // Valid tenant-A user & context, but the token asserts a DIFFERENT
        // tenant via the `tid` claim → rejected before the DB lookup.
        $token = TokenAudience::TENANT->issueToken($userA->id, ['tid' => self::TENANT_B]);
        $guard = $this->guard($token, self::TENANT_A);

        $this->assertFalse($guard->check());
    }

    public function test_fail_closed_when_no_tenant_context_is_resolved(): void
    {
        $user = $this->tenantUser(self::TENANT_A);

        $token = TokenAudience::TENANT->issueToken($user->id, ['tid' => self::TENANT_A]);
        // No tenant bound in the context (base/reserved host): must fail closed.
        $guard = $this->guard($token, null);

        $this->assertFalse($guard->check());
        $this->assertNull($guard->user());
    }

    public function test_non_active_tenant_user_is_rejected(): void
    {
        $user = TenantUser::factory()->forTenant(self::TENANT_A)->suspended()->create();

        $token = TokenAudience::TENANT->issueToken($user->id, ['tid' => self::TENANT_A]);
        $guard = $this->guard($token, self::TENANT_A);

        $this->assertFalse($guard->check());
    }

    public function test_missing_or_malformed_token_is_rejected(): void
    {
        $this->assertFalse($this->guard(null, self::TENANT_A)->check());
        $this->assertFalse($this->guard('garbage', self::TENANT_A)->check());
    }

    public function test_configured_tenant_guard_resolves_from_the_container(): void
    {
        $this->assertInstanceOf(TenantGuard::class, Auth::guard('tenant'));
    }

    public function test_same_email_may_exist_in_two_tenants(): void
    {
        // Per-tenant uniqueness: the same address in two tenants is two distinct
        // identities. Each authenticates ONLY within its own tenant.
        $email = 'shared@example.test';
        $a = TenantUser::factory()->forTenant(self::TENANT_A)->create(['email' => $email]);
        $b = TenantUser::factory()->forTenant(self::TENANT_B)->create(['email' => $email]);

        $this->assertNotSame($a->id, $b->id);

        $tokenForB = TokenAudience::TENANT->issueToken($b->id);
        // In tenant-A context, tenant-B's user id must not resolve.
        $this->assertFalse($this->guard($tokenForB, self::TENANT_A)->check());
        // In tenant-B context it does.
        $this->assertTrue($this->guard($tokenForB, self::TENANT_B)->check());
    }
}
