<?php

namespace App\Platform\Audit;

/**
 * In-memory test fake for {@see PlatformAuditCollection}.
 *
 * It satisfies the SAME contract as the real {@see MongoDBPlatformAuditCollection}
 * (collection name, append-only `insertOne`, index declaration via
 * `createIndex`) so {@see MongoPlatformAuditLogStore} can be exercised fully
 * WITHOUT a live MongoDB or the Mongo driver (steering: no cloud calls in
 * tests, ADR-003 "behind an interface" so the store is replaceable/testable).
 *
 * It records the inserted documents and the requested indexes so tests can
 * assert: (a) events land in the `platform_audit_logs` collection,
 * (b) the exact index set was requested, and (c) nothing mutates existing
 * documents (there is no update/delete method — append-only by construction).
 */
final class InMemoryPlatformAuditCollection implements PlatformAuditCollection
{
    /** @var list<array<string,mixed>> */
    private array $documents = [];

    /** @var list<array{keys: array<string,int>, options: array<string,mixed>}> */
    private array $indexes = [];

    public function __construct(
        private readonly string $name = MongoPlatformAuditLogStore::COLLECTION,
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
