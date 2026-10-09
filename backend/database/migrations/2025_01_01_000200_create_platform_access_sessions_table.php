<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * B1-10 — `platform_access_sessions` (read-only platform→tenant access session).
 *
 * Models the SHAPE + invariants of the single hardened cross-plane READ path
 * (ADR-007 §6). B1 is FOUNDATIONS ONLY (human decision E-1): this table + the
 * state/validation model exist, but NOTHING here mints a tenant token, performs
 * write impersonation, or issues any usable tenant access credential. Live
 * read-only access-session token issuance + double-audit wiring are B3 behind
 * SEC-3. There is deliberately no `token`/`secret`/`access_token` column.
 *
 * PLATFORM-OWNED (ADR-007 §8): this table carries NO tenancy discriminator and
 * the model MUST NOT use `BelongsToTenant`. The `tenant_id` here is a plain
 * platform FK to the TARGET tenant (`tenants.id`), NOT the ADR-001 tenancy
 * scope key. It references `tenants` + `platform_users` only.
 *
 * Invariants (enforced primarily at the model/validation layer in
 * App\Platform\AccessSession; the schema records the shape):
 *   - mode is FIXED to 'read_only' (no write/full impersonation exists);
 *   - TTL <= 15 minutes: expires_at <= started_at + 15 min (CLAMPED by the
 *     model — see docs/notes/B1-10.md for the reject-vs-clamp decision);
 *   - reason is required and non-empty.
 *
 * FK NOTE (integration assumption): the `tenants` table ships in B1-01 and
 * `platform_users` in B1-02. This migration adds each FK constraint ONLY when
 * the referenced table is already present in the running worktree, so the
 * migration still runs where an upstream table has not yet been merged. When
 * B1-01 (and B1-02) are merged into the sprint branch the real FKs resolve.
 * The columns themselves are always created.
 */
return new class extends Migration
{
    /** Hard cap on an access session's lifetime (ADR-007 §6). */
    private const MAX_TTL_MINUTES = 15;

    public function up(): void
    {
        Schema::create('platform_access_sessions', function (Blueprint $table) {
            $table->id();

            // Platform actor who initiated the read-only session (FK to the
            // platform identity store, ADR-007 §8). NOT a tenant user.
            $table->unsignedBigInteger('platform_user_id');

            // TARGET tenant. This is a plain platform FK to `tenants.id`, NOT
            // the tenancy discriminator and NOT subject to any global scope
            // (ADR-007 §8). The model does not use BelongsToTenant.
            $table->unsignedBigInteger('tenant_id');

            // Fixed to 'read_only'. Modelled as a single-value enum so the
            // storage layer itself refuses any other mode. Write/full
            // impersonation is explicitly ABSENT in B1 (and deferred).
            $table->enum('mode', ['read_only'])->default('read_only');

            // Mandatory justification (ADR-007 §6). Non-empty enforced by the
            // model; NOT NULL enforced here.
            $table->text('reason');

            // Session window. expires_at is capped at started_at + 15 min by
            // the model before persistence.
            $table->timestamp('started_at');
            $table->timestamp('expires_at');

            // Set when the session is ended (early via DELETE in B3, or at TTL).
            $table->timestamp('ended_at')->nullable();

            // Correlation id for the double-audit trail (ADR-007 §6/§7).
            $table->string('request_id')->nullable();

            $table->timestamps();

            // Operator/audit lookup indexes. Intentionally NOT tenant-first
            // composite indexes — there is no tenancy dimension on this
            // platform-owned table (ADR-007 §8). `tenant_id` here is just the
            // target-tenant FK.
            $table->index('platform_user_id');
            $table->index('tenant_id');
            $table->index('expires_at');
            $table->index('request_id');
        });

        $this->addForeignKeysWhereResolvable();
        $this->addTtlAndModeChecks();
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_access_sessions');
    }

    /**
     * Add FKs only when the referenced upstream table exists in this worktree.
     *
     * SQLite (the test driver) does not support adding FKs via ALTER after
     * table creation, so FK constraints are added here only for server drivers.
     * On SQLite the relationship is still exercised at the model layer + tests;
     * the integration FK resolves on MySQL once B1-01/B1-02 are merged.
     */
    private function addForeignKeysWhereResolvable(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'pgsql'], true)) {
            return; // e.g. sqlite — see note above.
        }

        if (Schema::hasTable('platform_users')) {
            Schema::table('platform_access_sessions', function (Blueprint $table) {
                $table->foreign('platform_user_id')
                    ->references('id')->on('platform_users')
                    ->cascadeOnDelete();
            });
        }

        // Integration assumption: `tenants` (B1-01). Guarded so the migration
        // runs even if B1-01 is not yet in this worktree.
        if (Schema::hasTable('tenants')) {
            Schema::table('platform_access_sessions', function (Blueprint $table) {
                $table->foreign('tenant_id')
                    ->references('id')->on('tenants')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Belt-and-suspenders storage-layer invariants for drivers that support
     * post-create CHECK constraints (MySQL 8+/MariaDB/Postgres). The native
     * single-value ENUM already pins `mode`; the TTL CHECK makes the 15-minute
     * cap enforceable at the storage layer too. SQLite cannot add CHECKs after
     * create — the model + tests enforce the same invariants there.
     */
    private function addTtlAndModeChecks(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'pgsql'], true)) {
            return;
        }

        // mode is fixed to read_only.
        DB::statement(
            'ALTER TABLE platform_access_sessions ADD CONSTRAINT chk_pas_mode '.
            "CHECK (mode = 'read_only')"
        );

        // TTL <= 15 minutes. Expressed as a per-driver interval comparison.
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement(
                'ALTER TABLE platform_access_sessions ADD CONSTRAINT chk_pas_ttl '.
                'CHECK (expires_at <= started_at + INTERVAL '.self::MAX_TTL_MINUTES.' MINUTE)'
            );
        } else { // pgsql
            DB::statement(
                'ALTER TABLE platform_access_sessions ADD CONSTRAINT chk_pas_ttl '.
                "CHECK (expires_at <= started_at + INTERVAL '".self::MAX_TTL_MINUTES." minutes')"
            );
        }
    }
};
