<?php

namespace App\Platform\Audit;

use DateTimeImmutable;
use DateTimeInterface;

/**
 * Append-only platform-audit store backed by the SEPARATE MongoDB collection
 * `platform_audit_logs` (ADR-003 data store; ADR-007 §7 separate-collection
 * decision). This is the real implementation of the {@see PlatformAuditLogStore}
 * seam that B1-04 defined and bound to a temporary in-memory placeholder.
 *
 * SEPARATE COLLECTION GUARANTEE
 * -----------------------------
 * Platform audit events are NEVER mixed with tenant `audit_logs` (B1-11). This
 * store only ever talks to the {@see PlatformAuditCollection} it is given, whose
 * name is pinned to `platform_audit_logs` ({@see self::COLLECTION}). The store
 * refuses to operate against any other collection name — a defensive assertion
 * that the two audit planes cannot be cross-wired.
 *
 * APPEND-ONLY / IMMUTABLE GUARANTEE
 * ---------------------------------
 * The store exposes `record()` only. The underlying {@see PlatformAuditCollection}
 * seam has no update/replace/delete/drop method, so there is no code path — here
 * or in the collection abstraction — that can mutate or remove an existing
 * event. This matches ADR-007 §7 (append-only, immutable) and the B1-04
 * interface contract (`record(PlatformAuditEvent $event): void`, no mutators).
 *
 * REAL MONGO WIRING vs TEST FAKE
 * ------------------------------
 * This class is driver-agnostic. In production the bound
 * {@see PlatformAuditCollection} is {@see MongoDBPlatformAuditCollection},
 * constructed from config (`config/audit.php` → connection + db + collection,
 * credentials from Secrets Manager via env; see ADR-003 PrivateLink notes). In
 * tests the bound collection is {@see InMemoryPlatformAuditCollection}, so no
 * MongoDB/driver/network is touched (steering: no cloud calls in tests).
 */
final class MongoPlatformAuditLogStore implements PlatformAuditLogStore
{
    /**
     * The ONLY collection this store may ever write to. Pinned here so the
     * separation from tenant `audit_logs` is guaranteed in code, not just by
     * configuration.
     */
    public const COLLECTION = 'platform_audit_logs';

    /**
     * The required index set (ADR-007 §7 / B1-09 acceptance). Each entry is a
     * compound index whose first key is the primary filter dimension and whose
     * second key is `timestamp` (descending, newest-first) for time-ordered
     * reads. Declared as a constant so tests can assert the exact set.
     *
     * @var array<int, array<string,int>>
     */
    public const INDEXES = [
        ['category' => 1, 'timestamp' => -1],
        ['actor' => 1, 'timestamp' => -1],
        ['target_tenant_id' => 1, 'timestamp' => -1],
    ];

    public function __construct(
        private readonly PlatformAuditCollection $collection,
    ) {
        // Defensive: this store must only ever target the separate platform
        // collection. If some future mis-wiring handed it the tenant
        // `audit_logs` collection, fail loudly rather than silently mixing the
        // two audit planes (ADR-007 §7).
        if ($collection->name() !== self::COLLECTION) {
            throw new \InvalidArgumentException(sprintf(
                'MongoPlatformAuditLogStore must write to the separate "%s" collection, got "%s".',
                self::COLLECTION,
                $collection->name(),
            ));
        }
    }

    /**
     * Append a single platform-audit event to `platform_audit_logs`.
     *
     * Append-only: this performs exactly one `insertOne`. There is no read,
     * update, upsert, or delete.
     */
    public function record(PlatformAuditEvent $event): void
    {
        $this->collection->insertOne($this->toDocument($event));
    }

    /**
     * Declare the required indexes on the collection. Idempotent — safe to call
     * at boot/migration time. Call sites: a platform-plane bootstrap/migration
     * step, run by a human against Atlas (agents never apply — steering rule 6).
     */
    public function ensureIndexes(): void
    {
        foreach (self::INDEXES as $keys) {
            $this->collection->createIndex($keys);
        }
    }

    /**
     * Map the value object to the persisted document shape. Field names match
     * the B1-09 contract exactly:
     *   timestamp, actor, action, target, target_tenant_id, category,
     *   request_id, result, reason, access_session_context, ip, device.
     *
     * @return array<string,mixed>
     */
    private function toDocument(PlatformAuditEvent $event): array
    {
        $context = $event->context;

        return [
            'timestamp' => $this->timestamp($context),
            'actor' => $event->actor,
            'action' => $event->action,
            'target' => $this->contextValue($context, 'target'),
            'target_tenant_id' => $event->targetTenantId,
            'category' => $event->category,
            'request_id' => $this->contextValue($context, 'request_id'),
            'result' => $this->contextValue($context, 'result'),
            'reason' => $event->reason,
            'access_session_context' => $this->contextValue($context, 'access_session_context'),
            'ip' => $this->contextValue($context, 'ip'),
            'device' => $this->contextValue($context, 'device'),
            // Lifecycle events (B1-04) carry from/to; retained for the
            // tenant_lifecycle category so the transition is reconstructable.
            'from' => $event->from,
            'to' => $event->to,
        ];
    }

    /**
     * Resolve the event timestamp: honour an explicit `timestamp` in context
     * (so callers/tests can pin it), otherwise stamp "now" in UTC at write time.
     *
     * @param  array<string,mixed>  $context
     */
    private function timestamp(array $context): DateTimeInterface
    {
        $ts = $context['timestamp'] ?? null;

        if ($ts instanceof DateTimeInterface) {
            return $ts;
        }

        if (is_string($ts) && $ts !== '') {
            return new DateTimeImmutable($ts);
        }

        return new DateTimeImmutable('now');
    }

    /**
     * @param  array<string,mixed>  $context
     */
    private function contextValue(array $context, string $key): mixed
    {
        return $context[$key] ?? null;
    }
}
