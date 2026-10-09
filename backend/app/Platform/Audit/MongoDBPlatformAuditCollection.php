<?php

namespace App\Platform\Audit;

use App\Providers\AppServiceProvider;
use RuntimeException;

/**
 * Production {@see PlatformAuditCollection} backed by a real MongoDB collection
 * via the `mongodb` PHP extension / `mongodb/mongodb` driver (ADR-003:
 * MongoDB Atlas, ap-south-1, via PrivateLink).
 *
 * WIRING (production / local docker Mongo)
 * ----------------------------------------
 * Constructed from `config/audit.php` by {@see AppServiceProvider}:
 *   - URI       : config('audit.platform.mongo.uri')      (env MONGODB_URI; from Secrets Manager in prod, never committed)
 *   - database  : config('audit.platform.mongo.database') (env MONGODB_DATABASE)
 *   - collection: config('audit.platform.collection')     (fixed 'platform_audit_logs')
 *
 * It receives an already-constructed MongoDB collection object (duck-typed:
 * anything exposing `insertOne` and `createIndex`, which both the official
 * `MongoDB\Collection` and a test double satisfy). This class is intentionally
 * NOT exercised by the test suite — tests use {@see InMemoryPlatformAuditCollection}
 * — so the project stays free of a hard dependency on the Mongo driver until the
 * driver/package is installed (steering: no cloud calls in tests).
 *
 * APPEND-ONLY: it exposes only `insertOne` and `createIndex`, matching the seam.
 * It never calls update/replace/delete/drop on the underlying collection.
 */
final class MongoDBPlatformAuditCollection implements PlatformAuditCollection
{
    /**
     * @param  object  $collection  a MongoDB collection object exposing insertOne()/createIndex()
     *                              (e.g. \MongoDB\Collection). Typed as object so this file does
     *                              not require the Mongo driver to be installed to load.
     */
    public function __construct(
        private readonly object $collection,
        private readonly string $name = MongoPlatformAuditLogStore::COLLECTION,
    ) {
        if (! method_exists($this->collection, 'insertOne') || ! method_exists($this->collection, 'createIndex')) {
            throw new RuntimeException(
                'MongoDBPlatformAuditCollection requires a MongoDB collection exposing insertOne() and createIndex(). '
                .'Install mongodb/mongodb and the mongodb PHP extension, and wire it in AppServiceProvider.'
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
}
