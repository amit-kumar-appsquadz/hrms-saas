<?php

namespace Tests\Feature\Tenancy;

use App\Tenancy\Audit\AuditCollection;
use App\Tenancy\Audit\AuditLogStore;
use App\Tenancy\Audit\InMemoryAuditCollection;
use App\Tenancy\Audit\MongoAuditLogStore;
use App\Tenancy\Audit\TenantAuditEvent;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantResolutionException;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * B1-11 — Tenant audit store foundation (`audit_logs`, Mongo behind interface).
 *
 * These tests ARE the security evidence for the tenant audit sink (ADR-003
 * "audit behind an interface"; ADR-007 §7 separate collections; steering rules 2
 * and 7). They prove:
 *   - tenant events are written to `audit_logs` scoped by `tenant_id`;
 *   - the collection is SEPARATE from `platform_audit_logs` (name pinned to
 *     `audit_logs`; any other name is refused defensively, as B1-09 does);
 *   - the store is append-only (no update/delete path exists);
 *   - a read for tenant A can NEVER return tenant B's events (cross-tenant
 *     isolation enforced at the store);
 *   - with NO resolved tenant, write AND read FAIL CLOSED (throw), never
 *     writing tenant-less events nor returning all tenants' events;
 *   - the required `{tenant_id, occurred_at}` index is declared (tenant_id
 *     first — steering rule 2 / ADR-001 index strategy).
 *
 * No DB server and no cloud calls: the store runs against the in-memory
 * AuditCollection fake bound in tests (steering: no cloud calls in tests).
 */
class TenantAuditLogStoreTest extends TestCase
{
    private const TENANT_A = 101;

    private const TENANT_B = 202;

    private TenantContext $context;

    protected function setUp(): void
    {
        parent::setUp();

        $this->context = $this->app->make(TenantContext::class);
    }

    protected function tearDown(): void
    {
        $this->context->reset();

        parent::tearDown();
    }

    private function asTenant(int|string $tenantId, string $subdomain = 'acme'): void
    {
        $this->context->reset();
        $this->context->setTenant($tenantId, $subdomain);
    }

    private function store(): AuditLogStore
    {
        return $this->app->make(AuditLogStore::class);
    }

    private function collection(): InMemoryAuditCollection
    {
        /** @var InMemoryAuditCollection $c */
        $c = $this->app->make(AuditCollection::class);

        return $c;
    }

    private function event(string $action = 'user.login', string $category = 'auth'): TenantAuditEvent
    {
        return new TenantAuditEvent(
            action: $action,
            category: $category,
            actor: 'user-1',
            target: 'resource-9',
            result: 'success',
            reason: null,
        );
    }

    // --- Binding / wiring sanity --------------------------------------------

    public function test_default_binding_is_fake_not_mongo(): void
    {
        // Under APP_ENV=testing the driver defaults to the in-memory fake, so no
        // Mongo/cloud is touched (steering).
        $this->assertInstanceOf(InMemoryAuditCollection::class, $this->app->make(AuditCollection::class));
        $this->assertInstanceOf(MongoAuditLogStore::class, $this->store());
    }

    // --- Write scoped by tenant_id ------------------------------------------

    public function test_record_writes_to_audit_logs_scoped_by_tenant_id(): void
    {
        $this->asTenant(self::TENANT_A);

        $this->store()->record($this->event());

        $docs = $this->collection()->documents();
        $this->assertCount(1, $docs);
        $this->assertSame(self::TENANT_A, $docs[0]['tenant_id']);
        $this->assertSame('user.login', $docs[0]['action']);
        $this->assertArrayHasKey('occurred_at', $docs[0]);
    }

    public function test_tenant_id_is_always_present_and_stamped_from_context_not_caller(): void
    {
        // The event value object carries no tenant_id; the store stamps it from
        // the resolved context. Every written doc therefore has a tenant_id.
        $this->asTenant(self::TENANT_B);

        $this->store()->record($this->event('role.updated', 'rbac'));

        $docs = $this->collection()->documents();
        $this->assertSame(self::TENANT_B, $docs[0]['tenant_id']);
    }

    // --- Separate collection from platform ----------------------------------

    public function test_collection_name_is_audit_logs_separate_from_platform(): void
    {
        $this->assertSame('audit_logs', MongoAuditLogStore::COLLECTION);
        $this->assertSame('audit_logs', $this->collection()->name());
        $this->assertNotSame('platform_audit_logs', $this->collection()->name());
    }

    public function test_store_refuses_a_non_audit_logs_collection(): void
    {
        // Defensive, mirroring B1-09: handing the store any other collection
        // name (e.g. the platform one) must fail loudly, never silently mix the
        // two audit planes (ADR-007 §7).
        $this->expectException(InvalidArgumentException::class);

        new MongoAuditLogStore(
            new InMemoryAuditCollection('platform_audit_logs'),
            $this->app->make(TenantContext::class),
        );
    }

    // --- Append-only ---------------------------------------------------------

    public function test_store_is_append_only_no_mutate_or_delete_path(): void
    {
        // Type-level proof: neither the store nor the collection seam exposes any
        // update/replace/delete/drop method. Append-only by construction
        // (ADR-007 §7).
        foreach (['update', 'replace', 'delete', 'drop', 'remove', 'updateOne', 'deleteOne'] as $forbidden) {
            $this->assertFalse(
                method_exists(MongoAuditLogStore::class, $forbidden),
                "MongoAuditLogStore must not expose a '{$forbidden}' method (append-only)."
            );
            $this->assertFalse(
                method_exists(AuditCollection::class, $forbidden),
                "AuditCollection seam must not expose a '{$forbidden}' method (append-only)."
            );
        }
    }

    public function test_repeated_records_append_rather_than_overwrite(): void
    {
        $this->asTenant(self::TENANT_A);

        $this->store()->record($this->event('a.one'));
        $this->store()->record($this->event('a.two'));

        $this->assertCount(2, $this->collection()->documents());
    }

    // --- Read scoped to tenant ----------------------------------------------

    public function test_for_tenant_returns_only_current_tenant_events(): void
    {
        $this->asTenant(self::TENANT_A);
        $this->store()->record($this->event('a.event'));

        $this->asTenant(self::TENANT_B);
        $this->store()->record($this->event('b.event'));

        $this->asTenant(self::TENANT_A);
        $read = $this->store()->forTenant();

        $this->assertCount(1, $read);
        $this->assertSame('a.event', $read[0]['action']);
        $this->assertSame(self::TENANT_A, $read[0]['tenant_id']);
    }

    // --- Cross-tenant isolation at the store (headline test) ----------------

    public function test_cross_tenant_read_is_blocked_at_the_store(): void
    {
        $this->asTenant(self::TENANT_A);
        $this->store()->record($this->event('secret.a'));

        $this->asTenant(self::TENANT_B);
        $this->store()->record($this->event('secret.b'));

        // Tenant B reads back: must see ONLY its own event, never tenant A's.
        $this->asTenant(self::TENANT_B);
        $read = $this->store()->forTenant();

        $actions = array_column($read, 'action');
        $this->assertSame(['secret.b'], $actions);
        $this->assertNotContains('secret.a', $actions, 'Tenant B read tenant A audit — cross-tenant leak.');
    }

    // --- Fail-closed with no tenant -----------------------------------------

    public function test_record_without_tenant_fails_closed(): void
    {
        $this->context->reset();

        $this->expectException(TenantResolutionException::class);

        $this->store()->record($this->event());
    }

    public function test_record_without_tenant_writes_nothing(): void
    {
        $this->context->reset();

        try {
            $this->store()->record($this->event());
        } catch (TenantResolutionException) {
            // expected
        }

        $this->assertCount(0, $this->collection()->documents(), 'No tenant-less event may be written.');
    }

    public function test_read_without_tenant_fails_closed(): void
    {
        // Seed events for both tenants, then clear the context.
        $this->asTenant(self::TENANT_A);
        $this->store()->record($this->event('a'));
        $this->asTenant(self::TENANT_B);
        $this->store()->record($this->event('b'));
        $this->context->reset();

        $this->expectException(TenantResolutionException::class);

        $this->store()->forTenant();
    }

    public function test_read_without_tenant_never_returns_all_events(): void
    {
        $this->asTenant(self::TENANT_A);
        $this->store()->record($this->event('a'));
        $this->asTenant(self::TENANT_B);
        $this->store()->record($this->event('b'));
        $this->context->reset();

        $leaked = null;
        try {
            $leaked = $this->store()->forTenant();
        } catch (TenantResolutionException) {
            $leaked = null;
        }

        $this->assertNull($leaked, 'No-tenant read must fail closed, not return all tenants events.');
    }

    // --- Index declaration ---------------------------------------------------

    public function test_required_index_is_tenant_id_then_occurred_at(): void
    {
        $this->assertSame(
            [['tenant_id' => 1, 'occurred_at' => -1]],
            MongoAuditLogStore::INDEXES,
            'Required index must lead with tenant_id (steering rule 2 / ADR-001).'
        );
    }

    public function test_ensure_indexes_declares_the_tenant_index_on_the_collection(): void
    {
        /** @var MongoAuditLogStore $store */
        $store = $this->store();
        $store->ensureIndexes();

        $this->assertContains(
            ['tenant_id' => 1, 'occurred_at' => -1],
            $this->collection()->indexKeys(),
        );
    }

    public function test_index_leads_with_tenant_id(): void
    {
        /** @var MongoAuditLogStore $store */
        $store = $this->store();
        $store->ensureIndexes();

        foreach ($this->collection()->indexKeys() as $keys) {
            $this->assertSame('tenant_id', array_key_first($keys), 'Every declared index must lead with tenant_id.');
        }
    }

    // --- Event shape ---------------------------------------------------------

    public function test_event_to_array_does_not_carry_tenant_id(): void
    {
        // The caller cannot set the tenant on the event; it is stamped by the
        // store from context. This is the write-time cross-tenant guard.
        $this->assertArrayNotHasKey('tenant_id', $this->event()->toArray());
    }
}
