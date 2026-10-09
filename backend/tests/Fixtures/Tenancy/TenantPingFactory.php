<?php

namespace Tests\Fixtures\Tenancy;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * TenantPingFactory (B1-06 TEST FIXTURE).
 * ---------------------------------------
 * Factory for the {@see TenantPing} fixture model (steering: every tenant table
 * ships with a factory). `tenant_id` is intentionally LEFT UNSET by default so
 * tests can prove the BelongsToTenant auto-fill-on-insert from the resolved
 * tenant context. Tests that need to seed another tenant's rows set `tenant_id`
 * explicitly via the dedicated bypass path.
 *
 * @extends Factory<TenantPing>
 */
class TenantPingFactory extends Factory
{
    protected $model = TenantPing::class;

    public function definition(): array
    {
        return [
            'label' => $this->faker->unique()->word(),
        ];
    }

    /**
     * Explicitly pin a tenant_id (used only when seeding another tenant's rows
     * through the sanctioned bypass in tests).
     */
    public function forTenant(int|string $tenantId): static
    {
        return $this->state(fn () => ['tenant_id' => $tenantId]);
    }
}
