<?php

namespace Tests\Feature\Platform;

use App\Auth\TokenAudience;
use App\Models\Platform\PlatformUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * B1-03 — Platform plane middleware stack, exercised end-to-end over HTTP via the
 * `/api/v1/platform/_probe` probe route (behind EnsurePlatformAudience +
 * platform.authorize:platform.dashboard.view).
 *
 * This proves the boundary through the REAL middleware pipeline, not just the guard
 * in isolation (ADR-007 §1, §3, §4).
 */
class PlatformAudienceMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private const PROBE = '/api/v1/platform/_probe';

    public function test_request_without_a_token_is_denied(): void
    {
        $this->getJson(self::PROBE)
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_tenant_audience_token_is_rejected_on_a_platform_route(): void
    {
        $user = PlatformUser::factory()->superAdmin()->create();

        // Wrong audience on an otherwise valid subject → 401, regardless of path.
        $token = TokenAudience::TENANT->issueToken($user->id);

        $this->withToken($token)->getJson(self::PROBE)
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_platform_token_with_sufficient_permission_is_authorized(): void
    {
        $user = PlatformUser::factory()->superAdmin()->create();
        $token = TokenAudience::PLATFORM->issueToken($user->id);

        $this->withToken($token)->getJson(self::PROBE)
            ->assertOk()
            ->assertJsonPath('plane', 'platform')
            ->assertJsonPath('actor', $user->id);
    }

    public function test_platform_token_without_the_required_permission_is_forbidden(): void
    {
        // The /_probe-manage route requires platform.user.manage, granted ONLY to
        // PLATFORM_SUPER_ADMIN. An auditor is authenticated (audience OK) but the
        // per-permission authorizer forbids it → 403.
        $auditor = PlatformUser::factory()->auditor()->create();
        $token = TokenAudience::PLATFORM->issueToken($auditor->id);

        $this->withToken($token)->getJson('/api/v1/platform/_probe-manage')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'forbidden')
            ->assertJsonPath('error.required_permission', 'platform.user.manage');
    }

    public function test_super_admin_passes_the_high_privilege_probe(): void
    {
        $admin = PlatformUser::factory()->superAdmin()->create();
        $token = TokenAudience::PLATFORM->issueToken($admin->id);

        $this->withToken($token)->getJson('/api/v1/platform/_probe-manage')
            ->assertOk()
            ->assertJsonPath('scope', 'user.manage');
    }
}
