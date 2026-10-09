<?php

namespace Database\Factories\Tenant;

use App\Models\Tenant\TenantUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * TenantUserFactory (B1-07 stub).
 * -------------------------------
 * Builds tenant-owned `users` rows for tests. Because `users` is a TENANT table
 * (steering rule 2), a caller MUST pin the tenant: either pass
 * `['tenant_id' => ...]` or use {@see self::forTenant()}. The default leaves
 * `tenant_id` null so a test that forgets to scope the user fails loudly (NOT
 * NULL constraint) rather than silently creating a cross-tenant-ambiguous row.
 *
 * Once B1-06's `BelongsToTenant` trait is on the model, inserts inside a
 * resolved tenant context auto-fill `tenant_id`; until then the factory sets it
 * explicitly. Either way `tenant_id` is never taken from request input.
 *
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tenant\TenantUser>
 */
class TenantUserFactory extends Factory
{
    protected $model = TenantUser::class;

    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // tenant_id is required (tenant-owned). Left null by default so a
            // caller must set it via forTenant()/state — see class note.
            'tenant_id' => null,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'status' => 'active',
        ];
    }

    /**
     * Pin the user to a specific tenant id.
     */
    public function forTenant(int|string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
        ]);
    }

    /**
     * Mark the user non-active (not authenticatable in the stub).
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'suspended',
        ]);
    }
}
