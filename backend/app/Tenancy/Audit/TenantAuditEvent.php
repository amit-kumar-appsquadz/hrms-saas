<?php

namespace App\Tenancy\Audit;

use App\Tenancy\TenantContext;
use DateTimeImmutable;
use DateTimeInterface;

/**
 * Immutable value object describing a single TENANT-plane audit event (B1-11).
 *
 * This mirrors the platform-side `PlatformAuditEvent` (B1-09) so the two audit
 * planes reconcile cleanly at merge, but it is a SEPARATE type for a SEPARATE
 * sink: tenant events land in the tenant `audit_logs` collection, never in the
 * platform `platform_audit_logs` collection (ADR-007 §7).
 *
 * TENANT SCOPE
 * ------------
 * Unlike the platform event, a tenant audit event is ALWAYS owned by exactly
 * one tenant. The owning `tenant_id` is NOT carried on the value object itself:
 * it is stamped by {@see MongoAuditLogStore} from the resolved
 * {@see TenantContext} at write time (fail-closed), so a caller can
 * never (accidentally or maliciously) record an event for another tenant. This
 * matches the B1-06 `BelongsToTenant` auto-fill philosophy: the discriminator is
 * owned by the isolation boundary, not the caller.
 *
 * B1-10's double-audit and B1-04's tenant-side wiring consume this shape in
 * later tasks; B1-11 only provides the sink + seam.
 *
 * @see AuditLogStore
 */
final class TenantAuditEvent
{
    /**
     * @param  string  $action  machine action name, e.g. `user.login`
     * @param  string  $category  tenant audit category (ADR-007 §7), e.g. `auth`
     * @param  string|null  $actor  identifier of the tenant actor (null => system)
     * @param  string|null  $target  the entity the action acted on (opaque id)
     * @param  string|null  $result  outcome marker, e.g. `success` / `denied`
     * @param  string|null  $reason  human/operator reason recorded with the event
     * @param  array<string,mixed>  $context  optional extra structured context
     *                                        (e.g. request_id, ip, device, timestamp)
     */
    public function __construct(
        public readonly string $action,
        public readonly string $category,
        public readonly ?string $actor = null,
        public readonly ?string $target = null,
        public readonly ?string $result = null,
        public readonly ?string $reason = null,
        public readonly array $context = [],
    ) {}

    /**
     * Resolve the event's occurrence time: honour an explicit `occurred_at` or
     * `timestamp` in context (so callers/tests can pin it), otherwise stamp
     * "now" in UTC at build time. Returned as an immutable DateTime.
     */
    public function occurredAt(): DateTimeInterface
    {
        $ts = $this->context['occurred_at'] ?? $this->context['timestamp'] ?? null;

        if ($ts instanceof DateTimeInterface) {
            return $ts;
        }

        if (is_string($ts) && $ts !== '') {
            return new DateTimeImmutable($ts);
        }

        return new DateTimeImmutable('now');
    }

    /**
     * The non-tenant payload of the event. The owning `tenant_id` and the
     * `occurred_at` timestamp are added by the store, NOT here, so the tenant
     * discriminator is always stamped from the resolved tenant context.
     *
     * @return array<string,mixed>
     */
    public function toArray(): array
    {
        return [
            'action' => $this->action,
            'category' => $this->category,
            'actor' => $this->actor,
            'target' => $this->target,
            'result' => $this->result,
            'reason' => $this->reason,
            'context' => $this->context,
        ];
    }
}
