<?php

namespace Tests\Feature\Tenancy;

use App\Tenancy\BelongsToTenant;
use App\Tenancy\TenantCacheKey;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolutionException;
use App\Tenancy\TenantScope;
use Tests\Fixtures\Tenancy\CreateTenantPingsTable;
use Tests\Fixtures\Tenancy\TenantPing;
use Tests\TestCase;

/**
 * B1-06 — BelongsToTenant trait + global scope + auto-fill + cache keys.
 *
 * These tests ARE the security evidence for the tenant isolation mechanism
 * (ADR-001 "Mandatory global scope"; steering rule 2 and rule 7). They prove:
 *   - reads are auto-scoped to the current tenant;
 *   - inserts auto-fill tenant_id from the current tenant;
 *   - tenant A cannot read tenant B's rows (cross-tenant read blocked);
 *   - the ONLY cross-tenant path is the explicit, documented bypass;
 *   - cache keys are tenant-prefixed (`t:{id}:`);
 *   - with NO resolved tenant, a tenant-scoped query FAILS CLOSED (throws),
 *     never returning all tenants' rows.
 *
 * No DB server and no cloud calls: the fixture table is built on the sqlite
 * `:memory:` connection configured in phpunit.xml.
 */
class BelongsToTenantTest extends TestCase
{
    private const TENANT_A = 101;

    private const TENANT_B = 202;

    private TenantContext $context;

    protected function setUp(): void
    {
        parent::setUp();

        // Build the fixture table on the in-memory sqlite connection.
        CreateTenantPingsTable::up();

        // The singleton TenantContext the app + scope read from.
        $this->context = $this->app->make(TenantContext::class);
    }

    protected function tearDown(): void
    {
        CreateTenantPingsTable::down();
        $this->context->reset();

        parent::tearDown();
    }

    /**
     * Enter a tenant's context (mirrors what ResolveTenant does per request).
     */
    private function asTenant(int|string $tenantId, string $subdomain = 'acme'): void
    {
        $this->context->reset();
        $this->context->setTenant($tenantId, $subdomain);
    }

    /**
     * Seed a row for a specific tenant by entering that tenant's context first
     * (the realistic path: rows are created inside the owning tenant's request).
     */
    private function seedPing(int|string $tenantId, string $label): TenantPing
    {
        $this->asTenant($tenantId);

        return TenantPing::create(['label' => $label]);
    }

    // --- Auto-fill on insert -------------------------------------------------

    public function test_insert_auto_fills_tenant_id_from_context(): void
    {
        $this->asTenant(self::TENANT_A);

        $ping = TenantPing::create(['label' => 'alpha']);

        $this->assertSame(self::TENANT_A, (int) $ping->tenant_id);
        $this->assertDatabaseHas('tenant_pings', [
            'label' => 'alpha',
            'tenant_id' => self::TENANT_A,
        ]);
    }

    public function test_insert_refuses_explicit_mismatched_tenant_id(): void
    {
        // Current tenant is A; attempting to write a row stamped for B is a
        // cross-tenant write and must be refused (fail-closed).
        $this->asTenant(self::TENANT_A);

        $this->expectException(TenantResolutionException::class);

        TenantPing::create(['label' => 'sneaky', 'tenant_id' => self::TENANT_B]);
    }

    // --- Auto-scoped reads ---------------------------------------------------

    public function test_read_is_auto_scoped_to_current_tenant(): void
    {
        $this->seedPing(self::TENANT_A, 'a1');
        $this->seedPing(self::TENANT_A, 'a2');
        $this->seedPing(self::TENANT_B, 'b1');

        $this->asTenant(self::TENANT_A);
        $labels = TenantPing::query()->pluck('label')->sort()->values()->all();

        $this->assertSame(['a1', 'a2'], $labels);
    }

    public function test_generated_sql_contains_tenant_predicate(): void
    {
        $this->asTenant(self::TENANT_A);

        $sql = TenantPing::query()->toSql();

        $this->assertStringContainsString('"tenant_pings"."tenant_id"', $sql);
    }

    // --- Cross-tenant read BLOCKED (the headline isolation test) -------------

    public function test_cross_tenant_read_is_blocked(): void
    {
        $this->seedPing(self::TENANT_A, 'secret-a');
        $this->seedPing(self::TENANT_B, 'secret-b');

        // Tenant B must never see tenant A's rows.
        $this->asTenant(self::TENANT_B);

        $all = TenantPing::query()->get();

        $this->assertCount(1, $all);
        $this->assertSame('secret-b', $all->first()->label);
        $this->assertNull(
            TenantPing::query()->where('label', 'secret-a')->first(),
            'Tenant B was able to read tenant A row — cross-tenant leak.'
        );
    }

    public function test_find_cannot_cross_tenant(): void
    {
        $aPing = $this->seedPing(self::TENANT_A, 'a-only');

        // From tenant B, find() by tenant A's primary key must return null.
        $this->asTenant(self::TENANT_B);

        $this->assertNull(TenantPing::query()->find($aPing->getKey()));
    }

    // --- No-tenant fail-closed behaviour -------------------------------------

    public function test_query_without_tenant_fails_closed(): void
    {
        // No tenant resolved -> a tenant-scoped query must NOT return all rows.
        $this->seedPing(self::TENANT_A, 'a');
        $this->seedPing(self::TENANT_B, 'b');
        $this->context->reset();

        $this->expectException(TenantResolutionException::class);

        // Building/executing the query triggers the scope -> requireTenantId().
        TenantPing::query()->get();
    }

    public function test_insert_without_tenant_fails_closed(): void
    {
        $this->context->reset();

        $this->expectException(TenantResolutionException::class);

        TenantPing::create(['label' => 'orphan']);
    }

    public function test_no_tenant_never_returns_all_rows(): void
    {
        $this->seedPing(self::TENANT_A, 'a');
        $this->seedPing(self::TENANT_B, 'b');
        $this->context->reset();

        // Prove the fail-closed path throws rather than silently widening.
        $leaked = null;
        try {
            $leaked = TenantPing::query()->get();
        } catch (TenantResolutionException $e) {
            $leaked = null;
        }

        $this->assertNull($leaked, 'No-tenant query must fail closed, not return rows.');
    }

    // --- Documented scope bypass (explicit + tested, steering rule 2) --------

    public function test_explicit_bypass_sees_all_tenants(): void
    {
        $this->seedPing(self::TENANT_A, 'a');
        $this->seedPing(self::TENANT_B, 'b');

        // Enter a tenant so the bypass is NOT merely masking a no-tenant state.
        $this->asTenant(self::TENANT_A);

        // Sanctioned cross-tenant read via the explicit, named helper. In a real
        // call site this line carries a justification comment and is this test's
        // subject (ADR-001 "explicit, audited bypass path").
        $all = TenantPing::withoutTenantScope()->pluck('label')->sort()->values()->all();

        $this->assertSame(['a', 'b'], $all);
    }

    public function test_bypass_works_even_without_tenant_context(): void
    {
        $this->seedPing(self::TENANT_A, 'a');
        $this->context->reset();

        // The bypass removes the scope entirely, so it does not call
        // requireTenantId() and does not throw with an empty context — this is
        // the intended behaviour of an explicit administrative cross-tenant path.
        $all = TenantPing::withoutTenantScope()->get();

        $this->assertCount(1, $all);
    }

    public function test_tenant_scope_is_registered_on_the_model(): void
    {
        // The global scope must be present on the model; its absence would mean
        // queries run unscoped (cross-tenant leak).
        $scopes = (new TenantPing)->getGlobalScopes();

        $this->assertArrayHasKey(TenantScope::class, $scopes);
    }

    // --- Cache-key prefixing -------------------------------------------------

    public function test_cache_key_is_tenant_prefixed(): void
    {
        $this->asTenant(self::TENANT_A);

        $helper = $this->app->make(TenantCacheKey::class);

        $this->assertSame('t:101:', $helper->prefix());
        $this->assertSame('t:101:dashboard', $helper->key('dashboard'));
    }

    public function test_model_cache_key_is_tenant_prefixed(): void
    {
        $this->asTenant(self::TENANT_B);

        $ping = TenantPing::create(['label' => 'cacheable']);

        $this->assertSame('t:202:ping:cacheable', $ping->tenantCacheKey('ping:cacheable'));
    }

    public function test_cache_keys_differ_across_tenants(): void
    {
        $helper = $this->app->make(TenantCacheKey::class);

        $this->asTenant(self::TENANT_A);
        $keyA = $helper->key('report');

        $this->asTenant(self::TENANT_B);
        $keyB = $helper->key('report');

        $this->assertNotSame($keyA, $keyB);
        $this->assertSame('t:101:report', $keyA);
        $this->assertSame('t:202:report', $keyB);
    }

    public function test_cache_key_fails_closed_without_tenant(): void
    {
        $this->context->reset();

        $helper = $this->app->make(TenantCacheKey::class);

        $this->expectException(TenantResolutionException::class);

        // No tenant -> must NOT produce an un-prefixed (cross-tenant) key.
        $helper->key('report');
    }

    public function test_static_cache_key_helper_prefixes_explicit_tenant(): void
    {
        $this->assertSame('t:999:x', TenantCacheKey::keyFor(999, 'x'));
        $this->assertSame('t:999:', TenantCacheKey::prefixFor(999));
    }

    // --- Trait wiring sanity -------------------------------------------------

    public function test_fixture_model_uses_trait(): void
    {
        $this->assertContains(BelongsToTenant::class, class_uses_recursive(TenantPing::class));
        $this->assertSame('tenant_id', TenantPing::tenantIdColumn());
    }
}
