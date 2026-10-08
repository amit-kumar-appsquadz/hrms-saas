<?php

namespace Tests\Fixtures\Tenancy;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CreateTenantPingsTable (B1-06 TEST FIXTURE — not a product migration).
 * ----------------------------------------------------------------------
 * Builds the `tenant_pings` fixture table used by the BelongsToTenant tests.
 * Kept out of `database/migrations` on purpose: it must not run in dev/prod
 * (real tenant tables are B4). Tests call {@see self::up()} /
 * {@see self::down()} directly against the sqlite `:memory:` connection.
 *
 * TENANCY SHAPE (ADR-001 / steering rule 2):
 *   - non-null `tenant_id` discriminator;
 *   - composite index starting with `tenant_id` (`tenant_id` is the first column
 *     of every index on a tenant-owned table — the p95 index strategy).
 */
class CreateTenantPingsTable
{
    public static function up(): void
    {
        Schema::create('tenant_pings', function (Blueprint $table) {
            $table->id();
            // ADR-001: every tenant-owned table carries a non-null tenant_id.
            $table->unsignedBigInteger('tenant_id');
            $table->string('label');
            $table->timestamps();

            // ADR-001 index strategy: tenant_id FIRST in the composite index.
            $table->index(['tenant_id', 'label']);
        });
    }

    public static function down(): void
    {
        Schema::dropIfExists('tenant_pings');
    }
}
