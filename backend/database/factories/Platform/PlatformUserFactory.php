<?php

namespace Database\Factories\Platform;

use App\Models\Platform\PlatformUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * Factory for the PLATFORM identity store (B1-02).
 *
 * @extends Factory<PlatformUser>
 */
class PlatformUserFactory extends Factory
{
    protected $model = PlatformUser::class;

    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            // One of the four fixed Phase-1 platform roles (ADR-007 §4).
            'platform_role' => fake()->randomElement([
                'PLATFORM_SUPER_ADMIN',
                'PLATFORM_SUPPORT',
                'PLATFORM_OPERATIONS',
                'PLATFORM_AUDITOR',
            ]),
            'status' => 'active',
            // MFA mandatory on the platform plane (ADR-007 §3).
            'mfa_enabled' => true,
            'last_login_at' => null,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn () => ['platform_role' => 'PLATFORM_SUPER_ADMIN']);
    }

    public function support(): static
    {
        return $this->state(fn () => ['platform_role' => 'PLATFORM_SUPPORT']);
    }

    public function operations(): static
    {
        return $this->state(fn () => ['platform_role' => 'PLATFORM_OPERATIONS']);
    }

    public function auditor(): static
    {
        return $this->state(fn () => ['platform_role' => 'PLATFORM_AUDITOR']);
    }

    public function suspended(): static
    {
        return $this->state(fn () => ['status' => 'suspended']);
    }
}
