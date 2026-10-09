<?php

namespace App\Platform\Audit;

/**
 * Thin, append-only abstraction over the MongoDB collection that backs the
 * platform audit log (`platform_audit_logs`, ADR-003 + ADR-007 §7).
 *
 * WHY THIS SEAM EXISTS
 * --------------------
 * ADR-003 keeps audit writes BEHIND AN INTERFACE so the store stays replaceable
 * and — critically for this project — so tests never need a live MongoDB
 * (steering: "No cloud calls in tests"). {@see MongoPlatformAuditLogStore}
 * depends ONLY on this contract, so:
 *   - in production it is backed by a real Mongo collection
 *     ({@see MongoDBPlatformAuditCollection}, wired from config), and
 *   - in tests it is backed by an in-memory fake
 *     ({@see InMemoryPlatformAuditCollection}) that asserts the SAME contract
 *     (collection name, append-only writes, requested indexes) without any
 *     network/driver dependency.
 *
 * APPEND-ONLY GUARANTEE
 * ---------------------
 * This interface exposes ONLY `insertOne` and `createIndex`. There is
 * deliberately NO update, replace, delete, or drop method. Append-only is a
 * security requirement (ADR-007 §7: platform audit is immutable), and the
 * absence of any mutate/delete method on this seam is how it is enforced at the
 * type level — the Mongo store physically cannot express a mutation.
 */
interface PlatformAuditCollection
{
    /**
     * The name of the underlying collection. MUST be the SEPARATE platform
     * collection `platform_audit_logs` — never the tenant `audit_logs`
     * collection (ADR-007 §7). Exposed so the store and tests can assert the
     * target collection is the platform one.
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
     * @param  array<string,int>  $keys  e.g. ['category' => 1, 'timestamp' => -1]
     * @param  array<string,mixed>  $options
     */
    public function createIndex(array $keys, array $options = []): void;
}
