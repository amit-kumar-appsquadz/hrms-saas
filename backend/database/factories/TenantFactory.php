<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'subdomain' => Str::slug($name) . '-' . fake()->unique()->numberBetween(1000, 9999),
            'name' => $name,
            'status' => 'provisioning',
            'plan' => fake()->randomElement(['starter', 'growth', 'enterprise']),
            'region' => 'ap-south-1',
            'primary_contact' => fake()->name(),
            'contact_email' => fake()->unique()->safeEmail(),
            'trial_ends_at' => null,
            'suspended_at' => null,
            'suspended_reason' => null,
            'offboarded_at' => null,
            'db_connection' => null,
        ];
    }

    public function trial(): static
    {
        return $this->state(fn () => [
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(30),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }

    public function suspended(): static
    {
        return $this->state(fn () => [
            'status' => 'suspended',
            'suspended_at' => now(),
            'suspended_reason' => 'non-payment',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'status' => 'inactive',
            'offboarded_at' => now(),
        ]);
    }
}
