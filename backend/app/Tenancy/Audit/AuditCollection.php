<?php

namespace App\Tenancy\Audit;

/**
 * Thin, append-only abstraction over the MongoDB collection that backs the
 * TENANT audit log (`audit_logs`, ADR-003 + ADR-007 §7).
 *
 * This is the tenant mirror of the platform-side `PlatformAuditCollection`
 * (B1-09). The two seams are deliberately parallel (same `name()`,
 * `insertOne()`, `createIndex()` shape) so the audit planes reconcile cleanly at
 * merge — but they are SEPARATE interfaces for SEPARATE collections. The tenant
 * seam additionally exposes a tenant-scoped read (`find`) because tenant audit,
 * unlike platform audit, must be read back per-tenant with cross-tenant
 * isolation enforced in the store (B1-11 acceptance).
 *
 * WHY THIS SEAM EXISTS
 * --------------------
 * ADR-003 keeps audit writes BEHIND AN INTERFACE so the store stays replaceable
 * and — critically — so tests never need a live MongoDB (steering: "No cloud
 * calls in tests"). {@see MongoAuditLogStore} depends ONLY on this contract:
 *   - in production it is backed by a real Mongo collection
 *     ({@see MongoDBAuditCollection}, wired from config), and
 *   - in tests it is backed by an in-memory fake
 *     ({@see InMemoryAuditCollection}) that asserts the SAME contract
 *     (collection name, append-only writes, requested indexes, tenant-filtered
 *     reads) without any network/driver dependency.
 *
 * APPEND-ONLY GUARANTEE
 * ---------------------
 * This interface exposes `insertOne`, `createIndex`, and a read-only `find`.
 * There is deliberately NO update, replace, delete, or drop method. Append-only
 * is a security requirement (ADR-007 §7: audit is immutable); the absence of any
 * mutate/delete method on this seam is how it is enforced at the type level —
 * the Mongo store physically cannot express a mutation.
 */
interface AuditCollection
{
    /**
     * The name of the underlying collection. MUST be the SEPARATE tenant
     * collection `audit_logs` — never the platform `platform_audit_logs`
     * collection (ADR-007 §7). Exposed so the store and tests can assert the
     * target collection is the tenant one.
     */
    public function name(): string;

    /**
     * Append a single immutable audit document. Implementations MUST NOT update
     * or overwrite any existing document.
     *
     * @param  array<string,mixed>  $document
     */
    public function insertOne(array $document): void;

    /**
     * Ensure a single index exists on the collection (idempotent). Used at
     * bootstrap/migration time to declare the required index set; a repeated
     * call with the same keys is a no-op in Mongo.
     *
     * @param  array<string,int>  $keys  e.g. ['tenant_id' => 1, 'occurred_at' => -1]
     * @param  array<string,mixed>  $options
     */
    public function createIndex(array $keys, array $options = []): void;

    /**
     * Read documents matching an exact-match filter, newest-first by
     * `occurred_at`. Read-only — never mutates. The STORE is responsible for
     * always passing a `tenant_id` in the filter; this method is a dumb query
     * seam and does not itself know the tenant.
     *
     * @param  array<string,mixed>  $filter  exact-match field => value filter
     * @return list<array<string,mixed>>
     */
    public function find(array $filter): array;
}
