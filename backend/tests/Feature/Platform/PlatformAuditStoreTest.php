<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Platform\Audit\InMemoryPlatformAuditCollection;
use App\Platform\Audit\MongoPlatformAuditLogStore;
use App\Platform\Audit\PlatformAuditCollection;
use App\Platform\Audit\PlatformAuditEvent;
use App\Platform\Audit\PlatformAuditLogStore;
use App\Platform\TenantLifecycle;
use ReflectionClass;
use Tests\TestCase;

/**
 * B1-09 — Platform audit store (`platform_audit_logs`, separate Mongo collection).
 *
 * These tests exercise the real append-only {@see MongoPlatformAuditLogStore}
 * through the {@see PlatformAuditCollection} seam, backed by the in-memory fake
 * ({@see InMemoryPlatformAuditCollection}) so there are NO cloud/Mongo calls
 * (steering; ADR-003 "behind an interface").
 *
 * Covers the B1-09 acceptance criteria:
 *   - events written to `platform_audit_logs` (NOT tenant `audit_logs`);
 *   - the three required indexes are declared;
 *   - append-only — no update/delete/mutate path exists on the interface or impl;
 *   - lifecycle transitions (B1-04) emit an event via this store once the
 *     AppServiceProvider binding is swapped to the Mongo store.
 */
class PlatformAuditStoreTest extends TestCase
{
    private function makeStore(InMemoryPlatformAuditCollection $collection): MongoPlatformAuditLogStore
    {
        return new MongoPlatformAuditLogStore($collection);
    }

    private function sampleEvent(): PlatformAuditEvent
    {
        return new PlatformAuditEvent(
            action: 'tenant.suspend',
            category: 'tenant_lifecycle',
            actor: 'platform-user:7',
            targetTenantId: '42',
            from: 'active',
            to: 'suspended',
            reason: 'non-payment',
            context: [
                'timestamp' => '2025-01-02T03:04:05+00:00',
                'target' => 'tenant:42',
                'request_id' => 'req-xyz-1',
                'result' => 'success',
                'access_session_context' => ['session_id' => 'as-1', 'mode' => 'read_only'],
                'ip' => '203.0.113.9',
                'device' => 'cli/1.0',
            ],
        );
    }

    public function test_write_then_read_event_round_trips_all_contract_fields(): void
    {
        $collection = new InMemoryPlatformAuditCollection;
        $store = $this->makeStore($collection);

        $store->record($this->sampleEvent());

        $this->assertSame(1, $collection->count());
        $doc = $collection->documents()[0];

        // Exactly the B1-09 field set must be present on the persisted doc.
        foreach ([
            'timestamp', 'actor', 'action', 'target', 'target_tenant_id',
            'category', 'request_id', 'result', 'reason',
            'access_session_context', 'ip', 'device',
        ] as $field) {
            $this->assertArrayHasKey($field, $doc, "document must carry `{$field}`");
        }

        $this->assertSame('platform-user:7', $doc['actor']);
        $this->assertSame('tenant.suspend', $doc['action']);
        $this->assertSame('tenant:42', $doc['target']);
        $this->assertSame('42', $doc['target_tenant_id']);
        $this->assertSame('tenant_lifecycle', $doc['category']);
        $this->assertSame('req-xyz-1', $doc['request_id']);
        $this->assertSame('success', $doc['result']);
        $this->assertSame('non-payment', $doc['reason']);
        $this->assertSame(['session_id' => 'as-1', 'mode' => 'read_only'], $doc['access_session_context']);
        $this->assertSame('203.0.113.9', $doc['ip']);
        $this->assertSame('cli/1.0', $doc['device']);
        $this->assertInstanceOf(\DateTimeInterface::class, $doc['timestamp']);
        $this->assertSame('2025-01-02T03:04:05+00:00', $doc['timestamp']->format(\DateTimeInterface::ATOM));
    }

    public function test_events_go_to_platform_audit_logs_not_tenant_audit_logs(): void
    {
        $collection = new InMemoryPlatformAuditCollection;
        $store = $this->makeStore($collection);

        // The pinned collection name is the SEPARATE platform collection.
        $this->assertSame('platform_audit_logs', MongoPlatformAuditLogStore::COLLECTION);
        $this->assertSame('platform_audit_logs', $collection->name());
        $this->assertNotSame('audit_logs', $collection->name(), 'must NOT be the tenant collection');

        $store->record($this->sampleEvent());
        $this->assertSame(1, $collection->count());
    }

    public function test_store_refuses_to_target_the_tenant_audit_collection(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        // Handing the store a collection named like the tenant audit sink must
        // be rejected — the two audit planes can never be cross-wired.
        new MongoPlatformAuditLogStore(new InMemoryPlatformAuditCollection('audit_logs'));
    }

    public function test_the_three_required_indexes_are_declared(): void
    {
        $collection = new InMemoryPlatformAuditCollection;
        $store = $this->makeStore($collection);

        $store->ensureIndexes();

        $this->assertSame([
            ['category' => 1, 'timestamp' => -1],
            ['actor' => 1, 'timestamp' => -1],
            ['target_tenant_id' => 1, 'timestamp' => -1],
        ], $collection->indexKeys());

        // And the constant exposes exactly that set (first key is the filter
        // dimension, second is timestamp).
        $this->assertSame($collection->indexKeys(), MongoPlatformAuditLogStore::INDEXES);
    }

    public function test_store_is_append_only_no_mutate_or_delete_methods(): void
    {
        // Append-only is enforced at the type level: neither the interface, the
        // Mongo store, nor the collection seam exposes any mutate/delete path.
        $forbidden = ['update', 'updateOne', 'updateMany', 'replaceOne', 'delete',
            'deleteOne', 'deleteMany', 'remove', 'drop', 'truncate', 'findOneAndUpdate'];

        foreach ([
            PlatformAuditLogStore::class,
            MongoPlatformAuditLogStore::class,
            PlatformAuditCollection::class,
        ] as $type) {
            $methods = array_map(
                static fn ($m) => $m->getName(),
                (new ReflectionClass($type))->getMethods()
            );

            foreach ($forbidden as $bad) {
                $this->assertNotContains(
                    $bad,
                    $methods,
                    "{$type} must not expose a mutate/delete method `{$bad}` (append-only)"
                );
            }
        }

        // The interface's only behaviour is `record` (plus store-local index helper).
        $this->assertContains('record', array_map(
            static fn ($m) => $m->getName(),
            (new ReflectionClass(PlatformAuditLogStore::class))->getMethods()
        ));
    }

    public function test_multiple_records_are_appended_not_overwritten(): void
    {
        $collection = new InMemoryPlatformAuditCollection;
        $store = $this->makeStore($collection);

        $store->record($this->sampleEvent());
        $store->record($this->sampleEvent());
        $store->record($this->sampleEvent());

        $this->assertSame(3, $collection->count(), 'each record() appends a new immutable doc');
    }

    public function test_container_binds_the_mongo_store_backed_by_fake_in_tests(): void
    {
        // The B1-04 in-memory placeholder has been swapped: the resolved store
        // is now the real Mongo store, and (in tests) its collection is the
        // in-memory fake — so no cloud calls happen.
        $store = $this->app->make(PlatformAuditLogStore::class);
        $this->assertInstanceOf(MongoPlatformAuditLogStore::class, $store);

        $collection = $this->app->make(PlatformAuditCollection::class);
        $this->assertInstanceOf(InMemoryPlatformAuditCollection::class, $collection);
        $this->assertSame('platform_audit_logs', $collection->name());
    }

    public function test_lifecycle_transition_emits_an_event_via_this_store(): void
    {
        // Bind a shared in-memory collection so we can inspect what the
        // container-resolved store wrote when the lifecycle service runs.
        $collection = new InMemoryPlatformAuditCollection;
        $this->app->instance(PlatformAuditCollection::class, $collection);
        $this->app->instance(
            PlatformAuditLogStore::class,
            new MongoPlatformAuditLogStore($collection)
        );

        /** @var TenantLifecycle $lifecycle */
        $lifecycle = $this->app->make(TenantLifecycle::class);

        $tenant = new Tenant;
        $tenant->status = 'active';
        $tenant->forceFill(['id' => 77]);

        $lifecycle->transition($tenant, 'suspended', actor: 'platform-user:3', reason: 'policy');

        $this->assertSame(1, $collection->count(), 'lifecycle transition must emit one platform-audit event');

        $doc = $collection->documents()[0];
        $this->assertSame('tenant_lifecycle', $doc['category']);
        $this->assertSame('tenant.lifecycle.transition', $doc['action']);
        $this->assertSame('platform-user:3', $doc['actor']);
        $this->assertSame('77', $doc['target_tenant_id']);
        $this->assertSame('active', $doc['from']);
        $this->assertSame('suspended', $doc['to']);
        $this->assertSame('policy', $doc['reason']);
    }

    public function test_timestamp_defaults_to_now_when_not_provided(): void
    {
        $collection = new InMemoryPlatformAuditCollection;
        $store = $this->makeStore($collection);

        $store->record(new PlatformAuditEvent(
            action: 'platform.config.change',
            category: 'platform_config',
            actor: 'platform-user:1',
            targetTenantId: null,
            from: null,
            to: null,
            reason: null,
        ));

        $doc = $collection->documents()[0];
        $this->assertInstanceOf(\DateTimeInterface::class, $doc['timestamp']);
        // Null context fields are persisted as null (shape stays stable).
        $this->assertNull($doc['target']);
        $this->assertNull($doc['request_id']);
        $this->assertNull($doc['ip']);
    }
}
