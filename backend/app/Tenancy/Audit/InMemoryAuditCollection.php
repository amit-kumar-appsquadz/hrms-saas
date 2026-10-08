<?php

namespace App\Tenancy\Audit;

use DateTimeInterface;

/**
 * In-memory test fake for {@see AuditCollection}.
 *
 * Tenant mirror of the platform-side `InMemoryPlatformAuditCollection` (B1-09).
 * It satisfies the SAME contract as the real {@see MongoDBAuditCollection}
 * (collection name, append-only `insertOne`, index declaration via
 * `createIndex`, tenant-filtered `find`) so {@see MongoAuditLogStore} can be
 * exercised fully WITHOUT a live MongoDB or the Mongo driver (steering: no cloud
 * calls in tests; ADR-003 "behind an interface" so the store is
 * replaceable/testable).
 *
 * It records the inserted documents and the requested indexes so tests can
 * assert: (a) events land in the `audit_logs` collection, (b) the exact index
 * set was requested, (c) nothing mutates existing documents (there is no
 * update/delete method — append-only by construction), and (d) `find` returns
 * only documents matching the (tenant-scoped) filter, newest-first.
 */
final class InMemoryAuditCollection implements AuditCollection
{
    /** @var list<array<string,mixed>> */
    private array $documents = [];

    /** @var list<array{keys: array<string,int>, options: array<string,mixed>}> */
    private array $indexes = [];

    public function __construct(
        private readonly string $name = MongoAuditLogStore::COLLECTION,
    ) {}

    public function name(): string
    {
        return $this->name;
    }

    /**
     * @param  array<string,mixed>  $document
     */
    public function insertOne(array $document): void
    {
        // Append-only: push a new document; never overwrite an existing one.
        $this->documents[] = $document;
    }

    /**
     * @param  array<string,int>  $keys
     * @param  array<string,mixed>  $options
     */
    public function createIndex(array $keys, array $options = []): void
    {
        $this->indexes[] = ['keys' => $keys, 'options' => $options];
    }

    /**
     * Exact-match filter + newest-first by `occurred_at`, mirroring the Mongo
     * adapter. The STORE always passes `tenant_id` in the filter, so this fake
     * reproduces the cross-tenant isolation faithfully.
     *
     * @param  array<string,mixed>  $filter
     * @return list<array<string,mixed>>
     */
    public function find(array $filter): array
    {
        $matched = array_values(array_filter(
            $this->documents,
            static function (array $doc) use ($filter): bool {
                foreach ($filter as $key => $value) {
                    // Loose compare so int|string tenant ids match consistently
                    // with how they are stamped/queried.
                    if (! array_key_exists($key, $doc) || (string) $doc[$key] !== (string) $value) {
                        return false;
                    }
                }

                return true;
            }
        ));

        usort($matched, static function (array $a, array $b): int {
            return self::sortKey($b) <=> self::sortKey($a); // descending (newest first)
        });

        return $matched;
    }

    /**
     * @param  array<string,mixed>  $doc
     */
    private static function sortKey(array $doc): int
    {
        $ts = $doc['occurred_at'] ?? null;

        if ($ts instanceof DateTimeInterface) {
            return $ts->getTimestamp();
        }

        if (is_string($ts) && $ts !== '') {
            return (int) strtotime($ts);
        }

        return 0;
    }

    // ---- test inspection helpers (not part of the production contract) ------

    /**
     * @return list<array<string,mixed>>
     */
    public function documents(): array
    {
        return $this->documents;
    }

    public function count(): int
    {
        return count($this->documents);
    }

    /**
     * The index key-specs requested via createIndex(), in declaration order.
     *
     * @return list<array<string,int>>
     */
    public function indexKeys(): array
    {
        return array_map(static fn (array $i): array => $i['keys'], $this->indexes);
    }
}
