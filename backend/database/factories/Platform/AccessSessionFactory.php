<?php

namespace Database\Factories\Platform;

use App\Platform\AccessSession;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for the read-only platform access session STATE model (B1-10).
 *
 * Produces valid sessions by default: a non-empty reason, mode read_only
 * (forced by the model regardless), and an expiry within the 15-minute cap.
 * It does NOT create any token — there is no token to create in B1.
 *
 * @extends Factory<AccessSession>
 */
class AccessSessionFactory extends Factory
{
    protected $model = AccessSession::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $started = CarbonImmutable::now();

        return [
            // Plain platform FKs. Real rows resolve against platform_users /
            // tenants once those tables are present (B1-02 / B1-01). Tests that
            // only exercise state invariants may use arbitrary ids.
            'platform_user_id' => 1,
            'tenant_id' => 1,
            // mode is forced to read_only by the model; included for clarity.
            'mode' => AccessSession::MODE_READ_ONLY,
            'reason' => fake()->sentence(),
            'started_at' => $started,
            'expires_at' => $started->addMinutes(AccessSession::MAX_TTL_MINUTES),
            'ended_at' => null,
            'request_id' => (string) fake()->uuid(),
        ];
    }

    /** A session whose window has already been closed. */
    public function ended(): static
    {
        return $this->state(fn () => ['ended_at' => CarbonImmutable::now()]);
    }

    /**
     * A session that REQUESTS a longer-than-cap TTL. The model clamps it back
     * to the 15-minute cap on save; useful for the TTL-cap test.
     */
    public function requestingOverCapTtl(): static
    {
        return $this->state(function (array $attributes) {
            $started = CarbonImmutable::instance($attributes['started_at']);

            return ['expires_at' => $started->addMinutes(60)];
        });
    }
}
