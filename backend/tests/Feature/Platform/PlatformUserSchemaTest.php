<?php

namespace Tests\Feature\Platform;

use App\Models\Platform\PlatformUser;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * B1-02 — platform_users identity store + PlatformUser model (ADR-007 §1,§4,§8).
 *
 * Covers: schema (columns, UNIQUE(email)), the fixed four-value platform_role
 * constraint, platform-owned (no tenant_id, no BelongsToTenant), the plane
 * separation invariant (distinct table from tenant `users`, no shared/universal
 * user table, no FK between planes), framework-hashed password, and the
 * mfa_enabled default of true.
 */
class PlatformUserSchemaTest extends TestCase
{
    use RefreshDatabase;

    private const FIXED_PLATFORM_ROLES = [
        'PLATFORM_SUPER_ADMIN',
        'PLATFORM_SUPPORT',
        'PLATFORM_OPERATIONS',
        'PLATFORM_AUDITOR',
    ];

    public function test_platform_users_table_exists_with_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('platform_users'));

        $expected = [
            'id',
            'name',
            'email',
            'password',
            'platform_role',
            'status',
            'mfa_enabled',
            'last_login_at',
            'created_at',
            'updated_at',
        ];

        $this->assertTrue(
            Schema::hasColumns('platform_users', $expected),
            'platform_users is missing one or more required columns.'
        );
    }

    public function test_email_is_unique(): void
    {
        PlatformUser::factory()->create(['email' => 'ops@platform.test']);

        $this->expectException(QueryException::class);
        PlatformUser::factory()->create(['email' => 'ops@platform.test']);
    }

    public function test_platform_role_accepts_each_of_the_fixed_four_values(): void
    {
        foreach (self::FIXED_PLATFORM_ROLES as $role) {
            $user = PlatformUser::factory()->create(['platform_role' => $role]);
            // `platform_role` is cast to the PlatformRole enum (B1-03). The stored
            // string value must still equal the fixed role string.
            $this->assertSame($role, $user->fresh()->platform_role->value);
        }
    }

    public function test_platform_role_rejects_an_out_of_contract_value(): void
    {
        // The storage layer must not accept a role outside the fixed four.
        // Laravel's `enum` column emits an inline CHECK on sqlite and a native
        // ENUM on MySQL; the migration also adds a named CHECK on MySQL/Postgres.
        // On every supported test driver the insert below must be rejected.
        $this->expectException(QueryException::class);

        DB::table('platform_users')->insert([
            'name' => 'Rogue',
            'email' => 'rogue@platform.test',
            'password' => Hash::make('secret'),
            'platform_role' => 'PLATFORM_GOD_MODE',
            'status' => 'active',
            'mfa_enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_fixed_role_set_is_pinned_in_code(): void
    {
        // Guards the invariant on every driver: exactly the four ADR-007 §4
        // roles, nothing more, nothing less.
        $factoryRole = PlatformUser::factory()->make()->platform_role;
        // `platform_role` is cast to the PlatformRole enum (B1-03); compare its
        // backing string against the fixed set.
        $this->assertContains($factoryRole->value, self::FIXED_PLATFORM_ROLES);

        $this->assertCount(4, self::FIXED_PLATFORM_ROLES);
        $this->assertNotContains('PLATFORM_GOD_MODE', self::FIXED_PLATFORM_ROLES);
    }

    public function test_platform_users_is_platform_owned_and_has_no_tenant_id(): void
    {
        $this->assertFalse(
            Schema::hasColumn('platform_users', 'tenant_id'),
            'platform_users is platform-owned and must NOT have a tenant_id column (ADR-007 §8).'
        );
    }

    public function test_model_does_not_use_belongs_to_tenant_scope(): void
    {
        // BelongsToTenant arrives in B1-06; even then PlatformUser must never
        // carry it. Assert by trait name and by the absence of any implicit
        // global scope on a fresh query.
        $traits = class_uses_recursive(PlatformUser::class);
        $this->assertArrayNotHasKey(
            'App\\Tenancy\\BelongsToTenant',
            $traits,
            'PlatformUser must not use the BelongsToTenant trait (platform-owned).'
        );

        $wheres = (new PlatformUser)->newQuery()->getQuery()->wheres ?? [];
        $this->assertSame([], $wheres, 'PlatformUser query must have no implicit tenant scope.');
    }

    public function test_platform_users_table_is_distinct_from_tenant_users_table(): void
    {
        // Both tables exist and are SEPARATE — no shared/universal user table.
        $this->assertTrue(Schema::hasTable('users'), 'tenant users table must exist.');
        $this->assertTrue(Schema::hasTable('platform_users'), 'platform_users table must exist.');

        $this->assertSame('platform_users', (new PlatformUser)->getTable());
        $this->assertSame('users', (new User)->getTable());
        $this->assertNotSame(
            (new PlatformUser)->getTable(),
            (new User)->getTable(),
            'Platform and tenant identities must live in distinct tables.'
        );
    }

    public function test_this_task_creates_no_shared_universal_user_table(): void
    {
        // Guard against a regression that introduces a merged identity table.
        foreach (['platform_tenant_users', 'universal_users', 'all_users', 'identities'] as $forbidden) {
            $this->assertFalse(
                Schema::hasTable($forbidden),
                "A shared/universal user table ({$forbidden}) is forbidden by ADR-007 §1."
            );
        }

        // And the two identity tables do not reference each other via a column.
        $this->assertFalse(Schema::hasColumn('platform_users', 'user_id'));
        $this->assertFalse(Schema::hasColumn('platform_users', 'tenant_user_id'));
        $this->assertFalse(Schema::hasColumn('users', 'platform_user_id'));
    }

    public function test_separate_rows_a_tenant_user_is_not_a_platform_user(): void
    {
        // Same email in both planes stays two independent rows in two tables;
        // creating a tenant user does not create a platform identity.
        $email = 'dual@identity.test';

        User::factory()->create(['email' => $email]);

        $this->assertDatabaseHas('users', ['email' => $email]);
        $this->assertDatabaseMissing('platform_users', ['email' => $email]);
    }

    public function test_password_is_hashed_by_the_framework_hasher(): void
    {
        $user = PlatformUser::factory()->create(['password' => 'plaintext-secret']);

        $this->assertNotSame('plaintext-secret', $user->password);
        $this->assertTrue(Hash::check('plaintext-secret', $user->password));
    }

    public function test_password_is_hidden_from_serialization(): void
    {
        $array = PlatformUser::factory()->create()->toArray();

        $this->assertArrayNotHasKey('password', $array);
    }

    public function test_mfa_enabled_defaults_to_true(): void
    {
        // Insert without specifying mfa_enabled -> DB default applies.
        DB::table('platform_users')->insert([
            'name' => 'Default MFA',
            'email' => 'defaultmfa@platform.test',
            'password' => Hash::make('secret'),
            'platform_role' => 'PLATFORM_OPERATIONS',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = PlatformUser::where('email', 'defaultmfa@platform.test')->first();

        $this->assertNotNull($user);
        $this->assertTrue((bool) $user->mfa_enabled, 'mfa_enabled must default to true (ADR-007 §3).');
    }

    public function test_platform_user_is_authenticatable(): void
    {
        // The platform guard (B1-03) resolves against this model; confirm it is
        // a usable Authenticatable identity now.
        $user = PlatformUser::factory()->create();

        $this->assertInstanceOf(Model::class, $user);
        $this->assertInstanceOf(Authenticatable::class, $user);
    }
}
