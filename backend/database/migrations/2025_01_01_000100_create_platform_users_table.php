<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * B1-02 — Platform identity store (`platform_users`).
 *
 * Platform-owned table (ADR-007 §8): PLATFORM plane only. It is deliberately
 * SEPARATE from the tenant `users` table — there is NO shared/universal user
 * table and NO foreign key between the two planes (ADR-007 §1). Because this is
 * platform-owned there is intentionally NO `tenant_id` column and NO
 * `BelongsToTenant` global scope: platform actors are cross-tenant and must not
 * live on the tenant plane (ADR-007 §4, §8).
 *
 * `platform_role` is constrained to the four FIXED values of the Phase-1
 * platform role enum (ADR-007 §4). The `PlatformRole` enum class + the
 * PlatformAuthorizer that maps roles -> `platform.*` permissions arrive in
 * B1-03; this migration only pins the allowed string values at the storage
 * layer so the identity store cannot hold an out-of-contract role.
 */
return new class extends Migration
{
    /**
     * The fixed Phase-1 platform roles (ADR-007 §4).
     * Mirrored (not imported) here on purpose: the PlatformRole enum class is
     * created in B1-03. Keep in sync with that enum when it lands.
     *
     * @var array<int, string>
     */
    private const PLATFORM_ROLES = [
        'PLATFORM_SUPER_ADMIN',
        'PLATFORM_SUPPORT',
        'PLATFORM_OPERATIONS',
        'PLATFORM_AUDITOR',
    ];

    /**
     * The allowed account statuses for a platform user.
     *
     * @var array<int, string>
     */
    private const STATUSES = [
        'active',
        'suspended',
        'disabled',
    ];

    public function up(): void
    {
        Schema::create('platform_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');

            // Platform identity key. UNIQUE within the platform plane only;
            // this is NOT shared with the tenant `users.email` space.
            $table->string('email')->unique();

            // Framework-hashed password (see PlatformUser `password` => 'hashed'
            // cast). Column named `password` so Laravel's hasher/auth plumbing
            // works out of the box; the brief's `password_hash` requirement is
            // satisfied by this hashed-credential column.
            $table->string('password');

            // Fixed Phase-1 platform role enum (ADR-007 §4). Constrained to the
            // four values; the enum CLASS + authorizer land in B1-03.
            $table->enum('platform_role', self::PLATFORM_ROLES);

            $table->enum('status', self::STATUSES)->default('active');

            // MFA mandatory on the platform plane (ADR-007 §3). Default true;
            // actual enrolment/enforcement is B2.
            $table->boolean('mfa_enabled')->default(true);

            $table->timestamp('last_login_at')->nullable();

            $table->timestamps();

            // Query helper for operator admin screens (B2+). Intentionally NOT
            // a tenant-first composite index — there is no tenant dimension on
            // the platform plane.
            $table->index('platform_role');
            $table->index('status');
        });

        // Belt-and-suspenders constraint for engines/drivers where `enum` is
        // not enforced (e.g. SQLite stores enum as TEXT with no check). MySQL
        // already enforces the ENUM; this adds an explicit CHECK where
        // supported so the fixed role set is guaranteed at the storage layer.
        $this->addPlatformRoleCheck();
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_users');
    }

    private function addPlatformRoleCheck(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        $roleList = collect(self::PLATFORM_ROLES)
            ->map(fn (string $role) => "'".$role."'")
            ->implode(', ');

        // SQLite CHECK constraints can only be declared at table-create time,
        // not added afterwards; the native ENUM column already restricts values
        // there via the stored type. For MySQL/Postgres we add an explicit
        // named CHECK so the invariant is enforced regardless of ENUM handling.
        if (in_array($driver, ['mysql', 'mariadb', 'pgsql'], true)) {
            DB::statement(
                'ALTER TABLE platform_users ADD CONSTRAINT chk_platform_users_role '.
                "CHECK (platform_role IN ({$roleList}))"
            );
        }
    }
};
