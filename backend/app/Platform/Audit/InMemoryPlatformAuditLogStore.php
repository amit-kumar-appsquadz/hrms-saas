<?php

namespace App\Platform\Audit;

/**
 * Temporary in-memory platform-audit store used until B1-09 provides the real
 * append-only MongoDB implementation (`platform_audit_logs`).
 *
 * It is append-only (records are pushed, never updated or deleted) to match the
 * contract B1-09 must honour, and it lets B1-04's tests assert that each
 * lifecycle transition emits exactly one audit event with actor + from→to +
 * reason.
 *
 * This is intentionally a process-local store with NO persistence; it must be
 * replaced by B1-09 before any real platform-audit requirement is relied upon.
 */
final class InMemoryPlatformAuditLogStore implements PlatformAuditLogStore
{
    /**
     * @var list<PlatformAuditEvent>
     */
    private array $events = [];

    public function record(PlatformAuditEvent $event): void
    {
        // Append-only: new events are added; existing ones are never mutated.
        $this->events[] = $event;
    }

    /**
     * @return list<PlatformAuditEvent>
     */
    public function all(): array
    {
        return $this->events;
    }

    public function count(): int
    {
        return count($this->events);
    }

    public function latest(): ?PlatformAuditEvent
    {
        return $this->events === [] ? null : $this->events[array_key_last($this->events)];
    }
}
