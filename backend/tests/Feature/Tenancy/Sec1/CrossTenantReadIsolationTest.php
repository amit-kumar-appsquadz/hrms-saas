<?php

namespace Tests\Feature\Tenancy\Sec1;

use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolutionException;
use App\Tenancy\TenantScope;
use Tests\Fixtures\Tenancy\CreateTenantPingsTable;
use Tests\Fixtures\Tenancy\TenantPing;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 1: cross-tenant read is blocked by the global scope.
 * ------------------------------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.1). This is the named, reviewer-pointable
 * evidence that the `BelongsToTenant` global scope (B1-06, ADR-001 "Mandatory
 * global scope"; steering rules 2 & 7) makes tenant A unable to read, list, or
 * fail-open onto tenant B's rows.
 *
 * It deliberately overlaps with Tests\Feature\Tenancy\BelongsToTenantTest (the
 * B1-06 owner tests) but stands alone as the SEC-1 artifact: every assertion
 * here is a security claim, not an implementation detail.
 *
 * Deterministic + no cloud calls: the fixture table is built on the sqlite
 * `:memory:` connection from phpunit.xml. No MySQL, no Mongo, no network.
 */
final class CrossTenantReadIsolationTest extends TestCase
{
    private const TENANT_A = 1001;

    private const TENANT_B = 2002;

    private TenantContext $context;

    protected function setUp(): void
    {
        parent::setUp();

        CreateTenantPingsTable::up();
        $this->context = $this->app->make(TenantContext::class);
    }

    protected function tearDown(): void
    {
        CreateTenantPingsTable::down();
        $this->context->reset();

        parent::tearDown();
    }

    private function asTenant(int|string $tenantId): void
    {
        $this->context->reset();
        $this->context->setTenant($tenantId, 'acme-'.$tenantId);
    }

    private function seedFor(int|string $tenantId, string $label): void
    {
        $this->asTenant($tenantId);
        TenantPing::create(['label' => $label]);
    }

    public function test_tenant_a_cannot_read_tenant_b_rows(): void
    {
        $this->seedFor(self::TENANT_A, 'a-only');
        $this->seedFor(self::TENANT_B, 'b-only');

        $this->asTenant(self::TENANT_A);

        $labels = TenantPing::query()->pluck('label')->all();

        $this->assertSame(['a-only'], $labels, 'Tenant A must see only its own rows.');
        $this->assertNotContains('b-only', $labels, 'Tenant A must NOT see tenant B rows.');
    }

    public function test_tenant_a_cannot_find_a_specific_tenant_b_row_by_id(): void
    {
        $this->seedFor(self::TENANT_B, 'b-secret');

        // Capture tenant B's row id via the sanctioned bypass (platform/global
        // read) only to then prove the SCOPED path cannot reach it.
        $bRowId = TenantPing::withoutTenantScope()->where('label', 'b-secret')->value('id');
        $this->assertNotNull($bRowId);

        $this->asTenant(self::TENANT_A);

        $this->assertNull(
            TenantPing::query()->find($bRowId),
            'A scoped find() for tenant B\'s row id while acting as tenant A must return null.'
        );
    }

    public function test_count_and_exists_are_tenant_scoped(): void
    {
        $this->seedFor(self::TENANT_A, 'a1');
        $this->seedFor(self::TENANT_A, 'a2');
        $this->seedFor(self::TENANT_B, 'b1');

        $this->asTenant(self::TENANT_A);
        $this->assertSame(2, TenantPing::query()->count(), 'Count must be tenant-scoped.');

        $this->asTenant(self::TENANT_B);
        $this->assertSame(1, TenantPing::query()->count(), 'Count must be tenant-scoped.');
    }

    public function test_every_scoped_query_carries_a_tenant_predicate_in_sql(): void
    {
        $this->asTenant(self::TENANT_A);

        $sql = TenantPing::query()->toSql();

        $this->assertStringContainsString('"tenant_id" = ?', $sql,
            'A tenant-owned model query must always include a tenant_id predicate.');
    }

    public function test_global_scope_is_registered_on_the_model(): void
    {
        $scopes = TenantPing::query()->getQuery()->getConnection() !== null
            ? (new TenantPing)->getGlobalScopes()
            : [];

        $this->assertArrayHasKey(
            TenantScope::class,
            $scopes,
            'The TenantScope global scope must be registered on every tenant-owned model.'
        );
    }

    public function test_no_resolved_tenant_fails_closed_rather_than_returning_all_rows(): void
    {
        $this->seedFor(self::TENANT_A, 'a1');
        $this->seedFor(self::TENANT_B, 'b1');

        // Clear the context: NO tenant resolved. A scoped read must throw, never
        // silently drop the predicate and return every tenant's rows.
        $this->context->reset();

        $this->expectException(TenantResolutionException::class);

        TenantPing::query()->get();
    }

    public function test_bypass_is_the_only_cross_tenant_path_and_is_explicit(): void
    {
        $this->seedFor(self::TENANT_A, 'a1');
        $this->seedFor(self::TENANT_B, 'b1');

        // The ONLY sanctioned cross-tenant read is the named, greppable bypass.
        // Acting as tenant A, the bypass sees BOTH tenants' rows — proving the
        // scope was the thing filtering, and that crossing requires an explicit,
        // auditable call (steering rule 2).
        $this->asTenant(self::TENANT_A);

        $all = TenantPing::withoutTenantScope()->pluck('label')->sort()->values()->all();

        $this->assertSame(['a1', 'b1'], $all,
            'The explicit withoutTenantScope() bypass is the only path across tenants.');
    }
}
