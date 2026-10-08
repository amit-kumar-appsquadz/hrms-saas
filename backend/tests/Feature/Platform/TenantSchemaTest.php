<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/**
 * B1-01 — tenants table schema + Tenant model (ADR-008).
 *
 * Covers: schema (columns, unique, index), status enum values, platform-owned
 * (no tenant_id / no BelongsToTenant), and subdomain immutability.
 */
class TenantSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenants_table_has_the_adr008_columns(): void
    {
        $this->assertTrue(Schema::hasTable('tenants'));

        $expected = [
            'id',
            'subdomain',
            'name',
            'status',
            'plan',
            'region',
            'primary_contact',
            'contact_email',
            'trial_ends_at',
            'suspended_at',
            'suspended_reason',
            'offboarded_at',
            'db_connection',
            'created_at',
            'updated_at',
        ];

        $this->assertTrue(
            Schema::hasColumns('tenants', $expected),
            'tenants table is missing one or more ADR-008 columns.'
        );
    }

    public function test_tenants_table_is_platform_owned_and_has_no_tenant_id(): void
    {
        $this->assertFalse(
            Schema::hasColumn('tenants', 'tenant_id'),
            'tenants is platform-owned and must NOT have a tenant_id column.'
        );
    }

    public function test_tenant_model_does_not_use_belongs_to_tenant_scope(): void
    {
        // The trait does not exist until B1-06, but even once it does the
        // Tenant model must never carry it. Assert by trait name + by the
        // absence of any global scope on a fresh query.
        $traits = class_uses_recursive(Tenant::class);
        $this->assertArrayNotHasKey(
            'App\\Tenancy\\BelongsToTenant',
            $traits,
            'Tenant must not use the BelongsToTenant trait (platform-owned).'
        );

        $scopes = (new Tenant())->newQuery()->getQuery()->wheres ?? [];
        $this->assertSame([], $scopes, 'Tenant query must have no implicit tenant scope.');
    }

    public function test_subdomain_is_unique(): void
    {
        Tenant::factory()->create(['subdomain' => 'acme']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Tenant::factory()->create(['subdomain' => 'acme']);
    }

    public function test_status_column_accepts_exactly_the_adr008_enum_values(): void
    {
        $this->assertSame(
            ['provisioning', 'trial', 'active', 'suspended', 'inactive'],
            Tenant::STATUSES,
            'Tenant::STATUSES must match the ADR-008 set exactly (no pending).'
        );

        $this->assertNotContains('pending', Tenant::STATUSES);

        foreach (Tenant::STATUSES as $status) {
            $tenant = Tenant::factory()->create(['status' => $status]);
            $this->assertSame($status, $tenant->fresh()->status);
        }
    }

    public function test_status_has_an_index(): void
    {
        // sqlite exposes indexes via pragma; this proves the migration created
        // an index covering the status column.
        $driver = DB::connection()->getDriverName();

        if ($driver !== 'sqlite') {
            $this->markTestSkipped('Index pragma assertion is sqlite-specific.');
        }

        $indexes = DB::select("PRAGMA index_list('tenants')");
        $covered = false;

        foreach ($indexes as $index) {
            $columns = collect(DB::select("PRAGMA index_info('" . $index->name . "')"))
                ->pluck('name')
                ->all();
            if (in_array('status', $columns, true)) {
                $covered = true;
                break;
            }
        }

        $this->assertTrue($covered, 'tenants.status must be indexed.');
    }

    public function test_subdomain_is_immutable_after_creation(): void
    {
        $tenant = Tenant::factory()->create(['subdomain' => 'acme']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('immutable');

        $tenant->update(['subdomain' => 'acme-renamed']);
    }

    public function test_subdomain_change_is_not_persisted(): void
    {
        $tenant = Tenant::factory()->create(['subdomain' => 'acme']);

        try {
            $tenant->subdomain = 'hacked';
            $tenant->save();
        } catch (RuntimeException) {
            // expected
        }

        $this->assertSame('acme', $tenant->fresh()->subdomain);
    }

    public function test_other_fields_remain_mutable(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'provisioning']);

        $tenant->update(['status' => 'active', 'plan' => 'enterprise']);

        $fresh = $tenant->fresh();
        $this->assertSame('active', $fresh->status);
        $this->assertSame('enterprise', $fresh->plan);
    }

    public function test_can_login_reflects_status(): void
    {
        $this->assertTrue(Tenant::factory()->active()->create()->canLogin());
        $this->assertTrue(Tenant::factory()->trial()->create()->canLogin());
        $this->assertFalse(Tenant::factory()->suspended()->create()->canLogin());
        $this->assertFalse(Tenant::factory()->inactive()->create()->canLogin());
        $this->assertFalse(Tenant::factory()->create(['status' => 'provisioning'])->canLogin());
    }
}
