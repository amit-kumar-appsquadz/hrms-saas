<?php

namespace Tests\Feature\Platform;

use App\Auth\PlatformGuard;
use App\Auth\TokenAudience;
use App\Models\Platform\PlatformUser;
use App\Models\User;
use App\Platform\PlatformRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

/**
 * B1-03 — Platform auth guard + audience boundary (ADR-007 §1, §3).
 *
 * Proves the server-side plane boundary at the guard layer:
 *   - a `platform`-audience token authenticates a platform_user;
 *   - a `tenant`-audience token is REJECTED by the platform guard (path/host
 *     independent);
 *   - a tenant user (wrong identity store) cannot authenticate here;
 *   - the platform_role enum cast works end-to-end.
 */
class PlatformGuardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build a PlatformGuard whose request carries the given bearer token.
     */
    private function guardWithToken(?string $token): PlatformGuard
    {
        $request = Request::create('/api/v1/platform/_probe', 'GET');
        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        $provider = Auth::createUserProvider('platform_users');

        return new PlatformGuard($provider, $request);
    }

    public function test_platform_audience_token_authenticates_a_platform_user(): void
    {
        $user = PlatformUser::factory()->superAdmin()->create();

        $token = TokenAudience::PLATFORM->issueToken($user->id);
        $guard = $this->guardWithToken($token);

        $this->assertTrue($guard->check());
        $this->assertInstanceOf(PlatformUser::class, $guard->user());
        $this->assertSame($user->id, $guard->id());
    }

    public function test_tenant_audience_token_is_rejected_by_the_platform_guard(): void
    {
        $user = PlatformUser::factory()->create();

        // Same subject id, but WRONG audience → must be rejected regardless of path.
        $token = TokenAudience::TENANT->issueToken($user->id);
        $guard = $this->guardWithToken($token);

        $this->assertFalse($guard->check());
        $this->assertNull($guard->user());
    }

    public function test_tenant_user_cannot_authenticate_via_the_platform_guard(): void
    {
        // A tenant user in the SEPARATE `users` identity store.
        $tenantUser = User::factory()->create();

        // Ensure no platform_user shares that id (distinct identity stores).
        $this->assertNull(PlatformUser::find($tenantUser->id));

        // Even a correctly-signed platform-audience token whose subject is the
        // tenant user's id resolves to no platform_user → rejected.
        $token = TokenAudience::PLATFORM->issueToken($tenantUser->id);
        $guard = $this->guardWithToken($token);

        $this->assertFalse($guard->check());
        $this->assertNull($guard->user());
    }

    public function test_missing_or_malformed_token_is_rejected(): void
    {
        $this->assertFalse($this->guardWithToken(null)->check());
        $this->assertFalse($this->guardWithToken('garbage')->check());
    }

    public function test_platform_role_is_cast_to_the_enum(): void
    {
        $user = PlatformUser::factory()->support()->create();

        $this->assertInstanceOf(PlatformRole::class, $user->fresh()->platform_role);
        $this->assertSame(PlatformRole::PLATFORM_SUPPORT, $user->fresh()->platform_role);
    }

    public function test_configured_platform_guard_resolves_from_the_container(): void
    {
        $this->assertInstanceOf(PlatformGuard::class, Auth::guard('platform'));
    }
}
