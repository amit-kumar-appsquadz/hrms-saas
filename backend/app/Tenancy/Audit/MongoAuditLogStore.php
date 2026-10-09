<?php

namespace App\Tenancy\Audit;

use App\Tenancy\TenantContext;
use InvalidArgumentException;

/**
 * Append-only TENANT-audit store backed by the SEPARATE MongoDB collection
 * `audit_logs` (ADR-003 data store; ADR-007 §7 separate-collection decision).
 * This is the real implementation of the {@see AuditLogStore} seam.
 *
 * It is the tenant mirror of the platform-side `MongoPlatformAuditLogStore`
 * (B1-09); the two are deliberately parallel so the audit planes reconcile at
 * merge, but they target SEPARATE collections and the tenant store adds the
 * tenant_id stamping + cross-tenant read isolation that the platform store does
 * not need.
 *
 * SEPARATE COLLECTION GUARANTEE
 * -----------------------------
 * Tenant audit events are NEVER mixed with platform `platform_audit_logs`
 * (B1-09). This store only ever talks to the {@see AuditCollection} it is given,
 * whose name is pinned to `audit_logs` ({@see self::COLLECTION}). The store
 * refuses to operate against any other collection name — a defensive assertion
 * (mirroring B1-09) that the two audit planes cannot be cross-wired.
 *
 * TENANT SCOPE + FAIL-CLOSED
 * --------------------------
 * The store resolves the owning tenant from {@see TenantContext} itself; callers
 * never pass a tenant_id. This mirrors B1-06's `BelongsToTenant` auto-fill: the
 * discriminator is owned by the isolation boundary, not the caller.
 *   - WRITE: `record()` stamps `tenant_id` from `requireTenantId()`, which
 *     THROWS when no tenant is resolved — so an event is never written
 *     tenant-less (which could later be read by the wrong tenant, or by all).
 *   - READ: `forTenant()` filters by `requireTenantId()`, which THROWS when no
 *     tenant is resolved — so a read never silently returns every tenant's
 *     events. A read for tenant A always carries `tenant_id = A` in the filter,
 *     so it can never surface tenant B's events (cross-tenant isolation at the
 *     store, independent of any Eloquent global scope).
 *
 * APPEND-ONLY / IMMUTABLE GUARANTEE
 * ---------------------------------
 * The store exposes `record()` and a read only. The underlying
 * {@see AuditCollection} seam has no update/replace/delete/drop method, so there
 * is no code path — here or in the collection abstraction — that can mutate or
 * remove an existing event (ADR-007 §7).
 *
 * REAL MONGO WIRING vs TEST FAKE
 * ------------------------------
 * This class is driver-agnostic. In production the bound {@see AuditCollection}
 * is {@see MongoDBAuditCollection}, constructed from config
 * (`config/audit.php` → connection + db + collection, credentials from Secrets
 * Manager via env; ADR-003 PrivateLink). In tests the bound collection is
 * {@see InMemoryAuditCollection}, so no MongoDB/driver/network is touched
 * (steering: no cloud calls in tests).
 */
final class MongoAuditLogStore implements AuditLogStore
{
    /**
     * The ONLY collection this store may ever write to / read from. Pinned here
     * so the separation from platform `platform_audit_logs` is guaranteed in
     * code, not just by configuration.
     */
    public const COLLECTION = 'audit_logs';

    /**
     * The tenant discriminator field. Kept in sync with the B1-06
     * `BelongsToTenant` convention (`tenant_id`), and the FIRST key of the
     * required compound index (steering rule 2 / ADR-001 index strategy).
     */
    public const TENANT_KEY = 'tenant_id';

    /**
     * The required index set (B1-11 acceptance; ADR-001 index strategy). The
     * compound index leads with `tenant_id` (every tenant query filters on it
     * first) and orders by `occurred_at` descending for newest-first reads.
     * Declared as a constant so tests can assert the exact set.
     *
     * @var array<int, array<string,int>>
     */
    public const INDEXES = [
        ['tenant_id' => 1, 'occurred_at' => -1],
    ];

    public function __construct(
        private readonly AuditCollection $collection,
        private readonly TenantContext $tenantContext,
    ) {
        // Defensive: this store must only ever target the separate tenant
        // collection. If some future mis-wiring handed it the platform
        // `platform_audit_logs` collection, fail loudly rather than silently
        // mixing the two audit planes (ADR-007 §7).
        if ($collection->name() !== self::COLLECTION) {
            throw new InvalidArgumentException(sprintf(
                'MongoAuditLogStore must write to the separate "%s" collection, got "%s".',
                self::COLLECTION,
                $collection->name(),
            ));
        }
    }

    /**
     * Append a single tenant-audit event to `audit_logs`, stamped with the
     * CURRENTLY resolved tenant.
     *
     * Append-only: performs exactly one `insertOne`. No read, update, upsert,
     * or delete. Fail-closed: `requireTenantId()` throws if no tenant is
     * resolved, so a tenant-less event is never written.
     */
    public function record(TenantAuditEvent $event): void
    {
        // Fail-closed: no resolved tenant => throw, never write tenant-less.
        $tenantId = $this->tenantContext->requireTenantId();

        $this->collection->insertOne($this->toDocument($event, $tenantId));
    }

    /**
     * Read back this tenant's audit documents, newest-first.
     *
     * Fail-closed: `requireTenantId()` throws if no tenant is resolved, so this
     * never returns every tenant's events. The filter ALWAYS carries
     * `tenant_id = <current tenant>`, so a read for tenant A can never surface
     * tenant B's events (cross-tenant isolation enforced here, in the store).
     *
     * @return list<array<string,mixed>>
     */
    public function forTenant(): array
    {
        $tenantId = $this->tenantContext->requireTenantId();

        return $this->collection->find([self::TENANT_KEY => $tenantId]);
    }

    /**
     * Declare the required indexes on the collection. Idempotent — safe to call
     * at boot/migration time. Call sites: a tenant-plane bootstrap/migration
     * step, run by a human against Atlas (agents never apply — steering rule 6).
     */
    public function ensureIndexes(): void
    {
        foreach (self::INDEXES as $keys) {
            $this->collection->createIndex($keys);
        }
    }

    /**
     * Map the value object + resolved tenant to the persisted document shape.
     * `tenant_id` is ALWAYS present (stamped from context) and `occurred_at` is
     * resolved from the event (explicit or "now").
     *
     * @return array<string,mixed>
     */
    private function toDocument(TenantAuditEvent $event, int|string $tenantId): array
    {
        $context = $event->context;

        return [
            // Tenant discriminator — always present, stamped from context, never
            // taken from the caller (prevents cross-tenant writes).
            'tenant_id' => $tenantId,
            'occurred_at' => $event->occurredAt(),
            'action' => $event->action,
            'category' => $event->category,
            'actor' => $event->actor,
            'target' => $event->target,
            'result' => $event->result,
            'reason' => $event->reason,
            'request_id' => $this->contextValue($context, 'request_id'),
            'ip' => $this->contextValue($context, 'ip'),
            'device' => $this->contextValue($context, 'device'),
            'context' => $context,
        ];
    }

    /**
     * @param  array<string,mixed>  $context
     */
    private function contextValue(array $context, string $key): mixed
    {
        return $context[$key] ?? null;
    }
}
