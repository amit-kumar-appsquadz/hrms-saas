<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * B1-07 — make tenant `users` tenant-owned (minimal stub).
 * ---------------------------------------------------------
 * The B1-00 scaffold created a single, platform-shaped `users` table
 * (`id, name, email UNIQUE, password, ...`). For the TENANT plane the user
 * record MUST be tenant-owned (steering rule 2 + ADR-007 §1): every tenant
 * table carries `tenant_id`, composite indexes START with `tenant_id`, and the
 * `BelongsToTenant` global scope filters by the resolved tenant.
 *
 * This migration converts the stub `users` table into the minimal tenant-owned
 * shape the B1-07 tenant auth guard resolves against:
 *   id, tenant_id, email, password, status  (+ framework columns kept harmless)
 *
 * SCOPE (B1 = foundations only, B1_PLAN §0 / §B1-07):
 *   - This is a STUB. The full tenant user model, profile fields, RBAC, invites,
 *     and login/MFA UX are B2/B3. We add only what the guard needs to prove the
 *     plane + tenant boundary under test.
 *   - Email uniqueness becomes PER TENANT (composite UNIQUE(tenant_id, email))
 *     instead of global: the same address may exist in two different tenants,
 *     and a tenant user is identified only within its tenant.
 *
 * TENANCY (steering rule 2):
 *   - `tenant_id` is NOT NULL — a tenant user cannot exist outside a tenant.
 *   - The one composite index here starts with `tenant_id`.
 *   - The `BelongsToTenant` global scope is applied by the model once B1-06 is
 *     integrated (its trait is not in this worktree's base branch — see
 *     docs/notes/B1-07.md). Until then, the TenantGuard performs the tenant
 *     match explicitly against the resolved TenantContext, so cross-tenant
 *     authentication is rejected regardless of the global scope's presence.
 *
 * NOTE on sqlite (test DB): SQLite cannot drop a column that participates in a
 * UNIQUE index via a simple change, so we rebuild the unique constraint
 * carefully. We keep `name` nullable to avoid touching B2's richer schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop the global UNIQUE(email) from the scaffold; tenant users are
        // unique only WITHIN a tenant.
        Schema::table('users', function (Blueprint $table) {
            // Laravel's conventional index name for the scaffold's unique email.
            $table->dropUnique('users_email_unique');
        });

        Schema::table('users', function (Blueprint $table) {
            // Tenant ownership. Unsigned big int to match `tenants.id` (B1-01).
            // No FK constraint added here: `tenants` is created by a parallel
            // wave-1 task (B1-01) and may not be present in every worktree; the
            // column + composite index are what tenancy requires. The real FK
            // can be added when B1-01/B4 harden the schema.
            $table->unsignedBigInteger('tenant_id')->after('id');

            // Minimal lifecycle flag for the stub. Full status/RBAC is B2/B3.
            $table->string('status')->default('active')->after('password');

            // Composite UNIQUE scoped to the tenant: the SAME email may exist in
            // different tenants. The index STARTS with tenant_id (steering 2).
            $table->unique(['tenant_id', 'email'], 'users_tenant_id_email_unique');

            // Composite lookup index for the guard's tenant-scoped resolution.
            // Starts with tenant_id (steering rule 2).
            $table->index(['tenant_id', 'id'], 'users_tenant_id_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_tenant_id_email_unique');
            $table->dropIndex('users_tenant_id_id_index');
            $table->dropColumn(['tenant_id', 'status']);
            $table->unique('email', 'users_email_unique');
        });
    }
};
