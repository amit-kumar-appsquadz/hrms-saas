<?php

namespace App\Platform;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\Platform\AccessSessionFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/**
 * AccessSession — the read-only platform→tenant access session STATE model
 * (B1-10, ADR-007 §6).
 *
 * SCOPE (human decision E-1): B1 is FOUNDATIONS ONLY. This class models the
 * shape + invariants of the single hardened cross-plane READ path. It does
 * NOT, and must NOT, mint a tenant access token, perform write impersonation,
 * or issue any usable tenant credential. Live read-only token issuance +
 * double-audit wiring are B3 behind SEC-3. There is intentionally NO method
 * such as mint()/issueToken()/token()/impersonate() on this class — see
 * AccessSessionNoMintingTest and docs/notes/B1-10.md.
 *
 * PLATFORM-OWNED (ADR-007 §8): this model MUST NOT use `BelongsToTenant` and
 * the table carries NO tenancy discriminator. The `tenant_id` attribute is a
 * plain platform FK to the TARGET tenant (`tenants.id`), NOT the ADR-001
 * tenancy scope key. No global scope is applied.
 *
 * Enforced invariants (model/validation layer):
 *   - mode is FIXED to 'read_only' (MODE_READ_ONLY); any other value is
 *     refused on construction/validation.
 *   - TTL <= 15 minutes: expires_at is CLAMPED to started_at + 15 min. A
 *     caller-requested longer TTL is silently reduced to the cap (never
 *     extended). See docs/notes/B1-10.md for the reject-vs-clamp rationale.
 *   - reason is required and non-empty (whitespace-only is rejected).
 *
 * @property int $id
 * @property int $platform_user_id
 * @property int $tenant_id
 * @property string $mode
 * @property string $reason
 * @property CarbonImmutable $started_at
 * @property CarbonImmutable $expires_at
 * @property CarbonImmutable|null $ended_at
 * @property string|null $request_id
 */
class AccessSession extends Model
{
    use HasFactory;

    /** The one and only permitted mode. Write/full impersonation is absent. */
    public const MODE_READ_ONLY = 'read_only';

    /** Hard cap on an access session's lifetime (ADR-007 §6). */
    public const MAX_TTL_MINUTES = 15;

    protected $table = 'platform_access_sessions';

    /**
     * `mode` is intentionally NOT mass-assignable: it is forced to
     * MODE_READ_ONLY and can never be set to anything else by a caller.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'platform_user_id',
        'tenant_id',
        'reason',
        'started_at',
        'expires_at',
        'ended_at',
        'request_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'ended_at' => 'immutable_datetime',
        ];
    }

    protected static function newFactory(): Factory
    {
        return AccessSessionFactory::new();
    }

    /**
     * Boot-time guards. `mode` is forced to read_only on every create/save and
     * the core invariants are re-validated on persistence, so the invariants
     * hold regardless of how the row is built (factory, fill, direct new).
     */
    protected static function booted(): void
    {
        static::saving(function (AccessSession $session): void {
            // mode is fixed — ignore/override anything else.
            $session->setAttribute('mode', self::MODE_READ_ONLY);

            $session->assertReasonPresent();
            $session->clampExpiry();
        });
    }

    /**
     * Build a validated read-only access session (NOT persisted).
     *
     * This is the single construction entry point for the invariants. It does
     * NOT mint or return any token — it only produces a validated STATE object.
     * Persist with ->save() when wiring arrives (B3).
     *
     * @param  int  $platformUserId  initiating platform actor (platform_users.id)
     * @param  int  $tenantId        TARGET tenant (tenants.id); plain FK, not the scope key
     * @param  string  $reason       mandatory, non-empty justification
     * @param  CarbonInterface|null  $startedAt   defaults to now()
     * @param  CarbonInterface|null  $requestedExpiry  desired expiry; CLAMPED to the 15-min cap
     * @param  string|null  $requestId  correlation id for the audit trail
     */
    public static function start(
        int $platformUserId,
        int $tenantId,
        string $reason,
        ?CarbonInterface $startedAt = null,
        ?CarbonInterface $requestedExpiry = null,
        ?string $requestId = null,
    ): self {
        $started = CarbonImmutable::instance($startedAt ?? CarbonImmutable::now());
        $cap = $started->addMinutes(self::MAX_TTL_MINUTES);

        $requested = $requestedExpiry !== null
            ? CarbonImmutable::instance($requestedExpiry)
            : $cap;

        $session = new self();
        $session->platform_user_id = $platformUserId;
        $session->tenant_id = $tenantId;
        $session->mode = self::MODE_READ_ONLY; // fixed
        $session->reason = $reason;
        $session->started_at = $started;
        // Clamp here too so the invariant holds on an unsaved instance.
        $session->expires_at = $session->resolveCappedExpiry($started, $requested);
        $session->request_id = $requestId;

        // Validate the non-TTL invariants eagerly (TTL already clamped).
        $session->assertReasonPresent();
        $session->assertModeReadOnly();

        return $session;
    }

    /** True when the session has not been ended and the cap has not passed. */
    public function isActive(?CarbonInterface $at = null): bool
    {
        $now = CarbonImmutable::instance($at ?? CarbonImmutable::now());

        if ($this->ended_at !== null) {
            return false;
        }

        return $this->expires_at !== null && $now->lessThan($this->expires_at);
    }

    /** Remaining whole seconds before expiry (never negative). */
    public function remainingSeconds(?CarbonInterface $at = null): int
    {
        $now = CarbonImmutable::instance($at ?? CarbonImmutable::now());

        if ($this->expires_at === null || $now->greaterThanOrEqualTo($this->expires_at)) {
            return 0;
        }

        return (int) $now->diffInSeconds($this->expires_at, true);
    }

    // --- Invariant enforcement -------------------------------------------

    private function assertModeReadOnly(): void
    {
        if ($this->getAttribute('mode') !== self::MODE_READ_ONLY) {
            throw new InvalidArgumentException(
                'AccessSession mode is fixed to "read_only" (ADR-007 §6); '.
                'write/full impersonation does not exist in this model.'
            );
        }
    }

    private function assertReasonPresent(): void
    {
        $reason = $this->getAttribute('reason');

        if (! is_string($reason) || trim($reason) === '') {
            throw new InvalidArgumentException(
                'AccessSession requires a non-empty reason (ADR-007 §6).'
            );
        }
    }

    /**
     * Clamp expires_at to started_at + MAX_TTL_MINUTES. A requested expiry at
     * or before the cap is kept as-is; anything beyond the cap is reduced to
     * the cap (never extended).
     */
    private function clampExpiry(): void
    {
        $started = $this->getAttribute('started_at');
        $expires = $this->getAttribute('expires_at');

        if ($started === null) {
            $started = CarbonImmutable::now();
            $this->setAttribute('started_at', $started);
        }

        $started = CarbonImmutable::instance($started);

        if ($expires === null) {
            $this->setAttribute('expires_at', $started->addMinutes(self::MAX_TTL_MINUTES));

            return;
        }

        $this->setAttribute(
            'expires_at',
            $this->resolveCappedExpiry($started, CarbonImmutable::instance($expires))
        );
    }

    private function resolveCappedExpiry(CarbonImmutable $started, CarbonImmutable $requested): CarbonImmutable
    {
        $cap = $started->addMinutes(self::MAX_TTL_MINUTES);

        return $requested->greaterThan($cap) ? $cap : $requested;
    }

    /*
     * DELIBERATELY ABSENT (B1 FOUNDATIONS ONLY — human decision E-1 / ADR-007 §6):
     *   - no mint()/issueToken()/token()/accessToken()
     *   - no impersonate() / no write-impersonation path
     *   - no method that returns a usable tenant credential
     * Live read-only token issuance + double-audit wiring are B3 behind SEC-3.
     * AccessSessionNoMintingTest asserts none of these exist.
     */
}
