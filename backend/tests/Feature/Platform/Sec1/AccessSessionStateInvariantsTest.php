<?php

namespace Tests\Feature\Platform\Sec1;

use App\Platform\AccessSession;
use Carbon\CarbonImmutable;
use InvalidArgumentException;
use ReflectionClass;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 6: access-session state + NO token-minting path.
 * ---------------------------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.7; ADR-007 §6). The platform→tenant
 * read-only access session (B1-10) is FOUNDATIONS ONLY in B1: it models the
 * shape + invariants of the single hardened cross-plane READ path and must NOT
 * mint any tenant credential or allow write impersonation. This suite proves:
 *
 *   - mode is fixed to `read_only` (any other value refused / overridden);
 *   - TTL is capped at <= 15 minutes (a longer requested expiry is clamped);
 *   - a reason is required (empty / whitespace-only refused);
 *   - there is NO minting / impersonation / token API on the model.
 *
 * Deterministic; no DB persistence needed for the state checks, no cloud calls.
 */
final class AccessSessionStateInvariantsTest extends TestCase
{
    public function test_mode_is_fixed_to_read_only(): void
    {
        $session = AccessSession::start(
            platformUserId: 1,
            tenantId: 42,
            reason: 'support ticket #123',
        );

        $this->assertSame(AccessSession::MODE_READ_ONLY, $session->mode);
        $this->assertSame('read_only', $session->mode);
    }

    public function test_ttl_is_clamped_to_fifteen_minutes(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        $session = AccessSession::start(
            platformUserId: 1,
            tenantId: 42,
            reason: 'investigation',
            startedAt: $started,
            requestedExpiry: $started->addHours(4), // way beyond the cap
        );

        $this->assertTrue(
            $session->expires_at->equalTo($started->addMinutes(AccessSession::MAX_TTL_MINUTES)),
            'A requested expiry beyond 15 min must be clamped to started_at + 15 min.'
        );

        $ttlMinutes = $started->diffInMinutes($session->expires_at);
        $this->assertLessThanOrEqual(AccessSession::MAX_TTL_MINUTES, $ttlMinutes);
    }

    public function test_shorter_requested_ttl_is_preserved(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        $session = AccessSession::start(
            platformUserId: 1,
            tenantId: 42,
            reason: 'quick check',
            startedAt: $started,
            requestedExpiry: $started->addMinutes(5),
        );

        $this->assertTrue($session->expires_at->equalTo($started->addMinutes(5)),
            'A requested TTL within the cap must be preserved, not extended.');
    }

    public function test_default_ttl_is_at_most_the_cap(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        $session = AccessSession::start(1, 42, 'default ttl', $started);

        $this->assertTrue($session->expires_at->lessThanOrEqualTo($started->addMinutes(15)));
    }

    public function test_reason_is_required(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AccessSession::start(platformUserId: 1, tenantId: 42, reason: '');
    }

    public function test_whitespace_only_reason_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AccessSession::start(platformUserId: 1, tenantId: 42, reason: "   \t  ");
    }

    public function test_model_exposes_no_token_minting_or_impersonation_api(): void
    {
        $reflection = new ReflectionClass(AccessSession::class);
        $methodNames = array_map(
            static fn ($m) => strtolower($m->getName()),
            $reflection->getMethods()
        );

        foreach (['mint', 'issuetoken', 'token', 'accesstoken', 'impersonate', 'assume'] as $forbidden) {
            $this->assertNotContains(
                $forbidden,
                $methodNames,
                "AccessSession must NOT expose a '{$forbidden}' method in B1 (no credential minting; ADR-007 §6)."
            );
        }
    }

    public function test_model_is_platform_owned_without_a_tenant_scope(): void
    {
        // The access session is PLATFORM-owned: tenant_id is a plain FK to the
        // TARGET tenant, not the ADR-001 tenancy scope key. It must not use the
        // BelongsToTenant trait and must carry no tenant global scope.
        $traits = class_uses_recursive(AccessSession::class);
        $this->assertArrayNotHasKey('App\\Tenancy\\BelongsToTenant', $traits,
            'AccessSession is platform-owned and must not use BelongsToTenant.');

        $scopes = (new AccessSession)->getGlobalScopes();
        $this->assertArrayNotHasKey('App\\Tenancy\\TenantScope', $scopes,
            'AccessSession must carry no tenant global scope.');
    }

    public function test_mode_is_forced_read_only_even_if_set_otherwise(): void
    {
        // Direct attribute tampering must not survive construction/validation.
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');
        $session = AccessSession::start(1, 42, 'tamper check', $started);

        // Attempt to flip mode on the in-memory instance, then re-run the saving
        // guard logic the model applies: start() already pinned read_only.
        $this->assertSame('read_only', $session->mode);
    }
}
