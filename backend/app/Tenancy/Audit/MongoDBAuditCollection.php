<?php

namespace App\Tenancy\Audit;

use App\Providers\TenancyServiceProvider;
use RuntimeException;

/**
 * Production {@see AuditCollection} backed by a real MongoDB collection via the
 * `mongodb` PHP extension / `mongodb/mongodb` driver (ADR-003: MongoDB Atlas,
 * ap-south-1, via PrivateLink).
 *
 * Tenant mirror of the platform-side `MongoDBPlatformAuditCollection` (B1-09).
 *
 * WIRING (production / local docker Mongo)
 * ----------------------------------------
 * Constructed from `config/audit.php` by {@see TenancyServiceProvider}:
 *   - URI       : config('audit.tenant.mongo.uri')      (env MONGODB_URI; from Secrets Manager in prod, never committed)
 *   - database  : config('audit.tenant.mongo.database') (env MONGODB_DATABASE)
 *   - collection: config('audit.tenant.collection')     (fixed 'audit_logs')
 *
 * It receives an already-constructed MongoDB collection object (duck-typed:
 * anything exposing `insertOne`, `createIndex`, and `find`, which the official
 * `MongoDB\Collection` and a test double satisfy). This class is intentionally
 * NOT exercised by the test suite — tests use {@see InMemoryAuditCollection} —
 * so the project stays free of a hard dependency on the Mongo driver until the
 * driver/package is installed (steering: no cloud calls in tests).
 *
 * APPEND-ONLY: it exposes only `insertOne`, `createIndex`, and a read-only
 * `find`, matching the seam. It never calls update/replace/delete/drop on the
 * underlying collection.
 */
final class MongoDBAuditCollection implements AuditCollection
{
    /**
     * @param  object  $collection  a MongoDB collection object exposing insertOne()/createIndex()/find()
     *                              (e.g. \MongoDB\Collection). Typed as object so this file does
     *                              not require the Mongo driver to be installed to load.
     */
    public function __construct(
        private readonly object $collection,
        private readonly string $name = MongoAuditLogStore::COLLECTION,
    ) {
        if (
            ! method_exists($this->collection, 'insertOne')
            || ! method_exists($this->collection, 'createIndex')
            || ! method_exists($this->collection, 'find')
        ) {
            throw new RuntimeException(
                'MongoDBAuditCollection requires a MongoDB collection exposing insertOne(), createIndex() and find(). '
                .'Install mongodb/mongodb and the mongodb PHP extension, and wire it in TenancyServiceProvider.'
            );
        }
    }

    public function name(): string
    {
        return $this->name;
    }

    /**
     * @param  array<string,mixed>  $document
     */
    public function insertOne(array $document): void
    {
        $this->collection->insertOne($document);
    }

    /**
     * @param  array<string,int>  $keys
     * @param  array<string,mixed>  $options
     */
    public function createIndex(array $keys, array $options = []): void
    {
        $this->collection->createIndex($keys, $options);
    }

    /**
     * @param  array<string,mixed>  $filter
     * @return list<array<string,mixed>>
     */
    public function find(array $filter): array
    {
        // Newest-first by occurred_at, matching the compound index order.
        $cursor = $this->collection->find($filter, ['sort' => ['occurred_at' => -1]]);

        $out = [];
        foreach ($cursor as $doc) {
            // Normalise BSON documents to plain arrays for the seam contract.
            $out[] = is_array($doc) ? $doc : (array) $doc;
        }

        return $out;
    }
}
