<?php

namespace Tests\Fixtures\Tenancy;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * TenantPing (B1-06 TEST FIXTURE — not a product table).
 * ------------------------------------------------------
 * A minimal tenant-owned model used ONLY to exercise the {@see BelongsToTenant}
 * trait (global scope, auto-fill, cache keys, bypass). Real tenant tables arrive
 * in B4; this fixture lives under `tests/` so it never ships as a product model
 * or migration.
 *
 * It follows the ADR-001 shape for a tenant-owned table: a non-null `tenant_id`
 * discriminator and the `BelongsToTenant` trait. The accompanying migration
 * ({@see CreateTenantPingsTable}) puts `tenant_id` first in its composite index.
 */
class TenantPing extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $table = 'tenant_pings';

    protected $fillable = [
        'tenant_id',
        'label',
    ];

    protected static function newFactory(): TenantPingFactory
    {
        return TenantPingFactory::new();
    }
}
