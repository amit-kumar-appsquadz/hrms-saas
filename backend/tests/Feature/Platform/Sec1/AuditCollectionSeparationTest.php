<?php

namespace Tests\Feature\Platform\Sec1;

use App\Platform\Audit\InMemoryPlatformAuditCollection;
use App\Platform\Audit\MongoPlatformAuditLogStore;
use App\Platform\Audit\PlatformAuditEvent;
use App\Tenancy\Audit\InMemoryAuditCollection;
use App\Tenancy\Audit\MongoAuditLogStore;
use App\Tenancy\Audit\TenantAuditEvent;
use App\Tenancy\TenantContext;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * SEC-1 EVIDENCE — Invariant 7: platform vs tenant audit in SEPARATE collections.
 * -------------------------------------------------------------------------------
 * B1-12 (QA) SEC-1 harness (B1_PLAN §6.8; ADR-007 §7, ADR-003). Platform audit
 * and tenant audit are physically separate, append-only collections and are
 * never mixed. This suite proves:
 *
 *   - the platform store writes to `platform_audit_logs` and nowhere else;
 *   - the tenant store writes to `audit_logs` and nowhere else;
 *   - the two collection names are different;
 *   - a platform event lands ONLY in the platform collection, a tenant event
 *     ONLY in the tenant collection (no cross-contamination);
 *   - each store defensively REFUSES to be wired to the other plane's collection;
 *   - the tenant store stamps + isolates by tenant_id (cross-tenant read blocked).
 *
 * Uses in-memory audit collections (ADR-003 "behind an interface"); no MongoDB,
 * no driver, no cloud calls.
 */
final class AuditCollectionSeparationTest extends TestCase
{
    private const TENANT_A = 101;

    private const TENANT_B = 202;

    public function test_collection_names_are_fixed_and_different(): void
    {
        $this->assertSame('platform_audit_logs', MongoPlatformAuditLogStore::COLLECTION);
        $this->assertSame('audit_logs', MongoAuditLogStore::COLLECTION);
        $this->assertNotSame(MongoPlatformAuditLogStore::COLLECTION, MongoAuditLogStore::COLLECTION);
    }

    public function test_platform_event_lands_only_in_the_platform_collection(): void
    {
        $platformCollection = new InMemoryPlatformAuditCollection;
        $tenantCollection = new InMemoryAuditCollection;

        $platformStore = new MongoPlatformAuditLogStore($platformCollection);

        $platformStore->record(PlatformAuditEvent::forLifecycleTransition(
            actor: 'platform-user-1',
            targetTenantId: (string) self::TENANT_A,
            from: 'trial',
            to: 'active',
            reason: 'activation approved',
        ));

        $this->assertSame(1, $platformCollection->count(), 'Platform event must land in the platform collection.');
        $this->assertSame(0, $tenantCollection->count(), 'Platform event must NOT touch the tenant collection.');
        $this->assertSame('platform_audit_logs', $platformCollection->name());
    }

    public function test_tenant_event_lands_only_in_the_tenant_collection(): void
    {
        $platformCollection = new InMemoryPlatformAuditCollection;
        $tenantCollection = new InMemoryAuditCollection;

        $context = $this->app->make(TenantContext::class);
        $context->reset();
        $context->setTenant(self::TENANT_A, 'acme');

        $tenantStore = new MongoAuditLogStore($tenantCollection, $context);

        $tenantStore->record(new TenantAuditEvent(
            action: 'user.login',
            category: 'auth',
            actor: 'tenant-user-9',
            result: 'success',
        ));

        $this->assertSame(1, $tenantCollection->count(), 'Tenant event must land in the tenant collection.');
        $this->assertSame(0, $platformCollection->count(), 'Tenant event must NOT touch the platform collection.');
        $this->assertSame('audit_logs', $tenantCollection->name());
    }

    public function test_platform_store_refuses_the_tenant_collection(): void
    {
        // Wiring the platform store to the tenant collection must fail loudly.
        $wrong = new InMemoryPlatformAuditCollection('audit_logs');

        $this->expectException(InvalidArgumentException::class);
        new MongoPlatformAuditLogStore($wrong);
    }

    public function test_tenant_store_refuses_the_platform_collection(): void
    {
        $context = $this->app->make(TenantContext::class);
        $wrong = new InMemoryAuditCollection('platform_audit_logs');

        $this->expectException(InvalidArgumentException::class);
        new MongoAuditLogStore($wrong, $context);
    }

    public function test_tenant_audit_is_tenant_scoped_and_cross_tenant_read_is_blocked(): void
    {
        $tenantCollection = new InMemoryAuditCollection;
        $context = $this->app->make(TenantContext::class);

        // Tenant A writes an event.
        $context->reset();
        $context->setTenant(self::TENANT_A, 'acme');
        $storeA = new MongoAuditLogStore($tenantCollection, $context);
        $storeA->record(new TenantAuditEvent(action: 'a.event', category: 'auth'));

        // Tenant B writes an event into the SAME physical collection.
        $context->reset();
        $context->setTenant(self::TENANT_B, 'globex');
        $storeB = new MongoAuditLogStore($tenantCollection, $context);
        $storeB->record(new TenantAuditEvent(action: 'b.event', category: 'auth'));

        // Reading as tenant A surfaces ONLY tenant A's event.
        $context->reset();
        $context->setTenant(self::TENANT_A, 'acme');
        $storeReadA = new MongoAuditLogStore($tenantCollection, $context);
        $aEvents = $storeReadA->forTenant();

        $this->assertCount(1, $aEvents);
        $this->assertSame('a.event', $aEvents[0]['action']);
        $this->assertSame((string) self::TENANT_A, (string) $aEvents[0]['tenant_id']);

        // And every document carries the owning tenant's id (stamped from
        // context, never surfacing the other tenant's event to A).
        foreach ($aEvents as $doc) {
            $this->assertSame((string) self::TENANT_A, (string) $doc['tenant_id']);
        }
    }

    public function test_both_stores_are_append_only_no_mutate_or_delete_method(): void
    {
        foreach ([MongoPlatformAuditLogStore::class, MongoAuditLogStore::class] as $storeClass) {
            $methods = array_map('strtolower', get_class_methods($storeClass));

            foreach (['update', 'delete', 'remove', 'drop', 'replace', 'upsert'] as $forbidden) {
                $this->assertNotContains(
                    $forbidden,
                    $methods,
                    "{$storeClass} must be append-only — no '{$forbidden}' method (ADR-007 §7)."
                );
            }
        }
    }
}
