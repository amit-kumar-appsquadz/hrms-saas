<?php

namespace Tests\Feature\Platform;

use App\Platform\AccessSession;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * B1-10 — platform_access_sessions table + read-only session STATE model
 * (ADR-007 §6, §8). FOUNDATIONS ONLY (E-1): shape + invariants, no minting.
 *
 * Covers: schema/columns; platform-owned (no tenant_id scope / no
 * BelongsToTenant / no implicit global scope); reason required; TTL capped at
 * +15 min (clamped); mode fixed to read_only. The no-minting invariant lives
 * in AccessSessionNoMintingTest.
 */
class AccessSessionTest extends TestCase
{
    use RefreshDatabase;

    // --- Schema ----------------------------------------------------------

    public function test_table_exists_with_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('platform_access_sessions'));

        $expected = [
            'id',
            'platform_user_id',
            'tenant_id',
            'mode',
            'reason',
            'started_at',
            'expires_at',
            'ended_at',
            'request_id',
            'created_at',
            'updated_at',
        ];

        $this->assertTrue(
            Schema::hasColumns('platform_access_sessions', $expected),
            'platform_access_sessions is missing one or more required columns.'
        );
    }

    public function test_table_has_no_token_or_secret_column(): void
    {
        // B1 must not persist any usable tenant credential (E-1 / ADR-007 §6).
        foreach (['token', 'access_token', 'secret', 'tenant_token', 'jwt', 'bearer'] as $forbidden) {
            $this->assertFalse(
                Schema::hasColumn('platform_access_sessions', $forbidden),
                "platform_access_sessions must not have a `{$forbidden}` column in B1."
            );
        }
    }

    // --- Platform-owned (ADR-007 §8) ------------------------------------

    public function test_model_does_not_use_belongs_to_tenant_scope(): void
    {
        $traits = class_uses_recursive(AccessSession::class);

        $this->assertArrayNotHasKey(
            'App\\Tenancy\\BelongsToTenant',
            $traits,
            'AccessSession is platform-owned and must NOT use BelongsToTenant.'
        );
    }

    public function test_model_query_has_no_implicit_tenant_scope(): void
    {
        // tenant_id here is a plain target-tenant FK, not the tenancy
        // discriminator — a fresh query must carry no implicit where clause.
        $wheres = (new AccessSession)->newQuery()->getQuery()->wheres ?? [];

        $this->assertSame(
            [],
            $wheres,
            'AccessSession query must have no implicit tenant global scope.'
        );
    }

    public function test_tenant_id_is_a_plain_fk_not_a_scope_key(): void
    {
        // Rows for different target tenants coexist and are all visible from a
        // single platform-plane query (no scoping/segmentation by tenant_id).
        AccessSession::start(1, 101, 'support ticket #1')->save();
        AccessSession::start(1, 202, 'support ticket #2')->save();
        AccessSession::start(1, 303, 'support ticket #3')->save();

        $this->assertSame(3, AccessSession::query()->count());
        $this->assertEqualsCanonicalizing(
            [101, 202, 303],
            AccessSession::query()->pluck('tenant_id')->all()
        );
    }

    public function test_model_is_a_plain_eloquent_model(): void
    {
        $this->assertInstanceOf(Model::class, AccessSession::start(1, 1, 'x'));
    }

    // --- Reason required -------------------------------------------------

    public function test_start_requires_a_non_empty_reason(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AccessSession::start(1, 1, '');
    }

    public function test_start_rejects_a_whitespace_only_reason(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AccessSession::start(1, 1, "   \t\n ");
    }

    public function test_saving_without_a_reason_is_rejected(): void
    {
        // Even bypassing start() and setting attributes directly, the saving
        // guard refuses an empty reason.
        $session = new AccessSession();
        $session->platform_user_id = 1;
        $session->tenant_id = 1;
        $session->started_at = CarbonImmutable::now();
        $session->expires_at = CarbonImmutable::now()->addMinutes(5);
        $session->reason = '';

        $this->expectException(InvalidArgumentException::class);
        $session->save();
    }

    public function test_a_valid_reason_is_accepted_and_persisted(): void
    {
        $session = AccessSession::start(1, 1, 'Investigating payroll export bug');
        $session->save();

        $this->assertDatabaseHas('platform_access_sessions', [
            'id' => $session->id,
            'reason' => 'Investigating payroll export bug',
        ]);
    }

    // --- TTL cap (clamp) -------------------------------------------------

    public function test_expiry_is_clamped_to_15_minutes_when_a_longer_ttl_is_requested(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        $session = AccessSession::start(
            platformUserId: 1,
            tenantId: 1,
            reason: 'long investigation',
            startedAt: $started,
            requestedExpiry: $started->addHour(), // 60 min requested
        );

        // Clamped down to +15 min — never extended.
        $this->assertTrue(
            $session->expires_at->equalTo($started->addMinutes(15)),
            'A >15min TTL must be clamped to started_at + 15 min.'
        );
    }

    public function test_saving_clamps_an_over_cap_expiry(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        // Factory requests a 60-min TTL; the saving guard clamps it.
        $session = AccessSession::factory()
            ->requestingOverCapTtl()
            ->make(['started_at' => $started]);
        $session->save();

        $this->assertTrue(
            $session->fresh()->expires_at->equalTo($started->addMinutes(15)),
            'The saving guard must clamp expires_at to the 15-minute cap.'
        );
    }

    public function test_a_shorter_than_cap_ttl_is_preserved(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        $session = AccessSession::start(
            platformUserId: 1,
            tenantId: 1,
            reason: 'quick check',
            startedAt: $started,
            requestedExpiry: $started->addMinutes(5),
        );

        $this->assertTrue(
            $session->expires_at->equalTo($started->addMinutes(5)),
            'A sub-cap TTL must be preserved, not forced to 15 min.'
        );
    }

    public function test_default_ttl_is_the_15_minute_cap(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');

        $session = AccessSession::start(1, 1, 'default ttl', $started);

        $this->assertTrue($session->expires_at->equalTo($started->addMinutes(15)));
    }

    // --- Mode fixed to read_only ----------------------------------------

    public function test_mode_defaults_to_read_only(): void
    {
        $session = AccessSession::start(1, 1, 'reading');

        $this->assertSame(AccessSession::MODE_READ_ONLY, $session->mode);
        $this->assertSame('read_only', $session->mode);
    }

    public function test_mode_is_forced_to_read_only_even_if_overwritten(): void
    {
        $session = AccessSession::start(1, 1, 'reading');

        // Attempt to escalate the mode; the saving guard forces it back.
        $session->setAttribute('mode', 'read_write');
        $session->save();

        $this->assertSame(
            AccessSession::MODE_READ_ONLY,
            $session->fresh()->mode,
            'mode must be forced back to read_only on save — no write mode exists.'
        );
    }

    public function test_there_is_no_write_or_full_mode_constant(): void
    {
        // Guard against a regression that introduces a write/full mode.
        $constants = (new \ReflectionClass(AccessSession::class))->getConstants();

        foreach ($constants as $name => $value) {
            $this->assertNotContains(
                $value,
                ['read_write', 'write', 'full', 'impersonate'],
                "AccessSession must not define a non-read-only mode ({$name})."
            );
        }

        $this->assertSame('read_only', AccessSession::MODE_READ_ONLY);
    }

    public function test_isActive_reflects_window_and_ended_state(): void
    {
        $started = CarbonImmutable::parse('2025-01-01 10:00:00');
        $session = AccessSession::start(1, 1, 'window', $started);

        $this->assertTrue($session->isActive($started->addMinutes(5)));
        $this->assertFalse($session->isActive($started->addMinutes(20)));

        $session->ended_at = $started->addMinutes(2);
        $this->assertFalse($session->isActive($started->addMinutes(3)));
    }
}
