<?php

namespace App\Platform\Audit;

/**
 * Immutable value object describing a single platform-plane audit event.
 *
 * B1-04 populates the subset needed for tenant-lifecycle transitions
 * (actor + from→to + reason + target tenant). B1-09 (the real
 * `platform_audit_logs` Mongo store) will consume the same shape and enrich it
 * with transport/context fields (request_id, ip, device, access_session_context)
 * at the point of write — those are intentionally NOT the lifecycle service's
 * concern (it is a pure domain service).
 *
 * @see PlatformAuditLogStore
 */
final class PlatformAuditEvent
{
    /**
     * @param  string  $action  machine action name, e.g. `tenant.lifecycle.transition`
     * @param  string  $category  platform audit category (ADR-007 §7); lifecycle => `tenant_lifecycle`
     * @param  string|null  $actor  identifier of the platform actor performing the write (null => system)
     * @param  string|null  $targetTenantId  the tenant the transition acted on
     * @param  string|null  $from  source lifecycle status (null for initial provision)
     * @param  string|null  $to  destination lifecycle status
     * @param  string|null  $reason  human/operator reason recorded with the transition
     * @param  array<string,mixed>  $context  optional extra structured context
     */
    public function __construct(
        public readonly string $action,
        public readonly string $category,
        public readonly ?string $actor,
        public readonly ?string $targetTenantId,
        public readonly ?string $from,
        public readonly ?string $to,
        public readonly ?string $reason,
        public readonly array $context = [],
    ) {}

    /**
     * Convenience constructor for a tenant lifecycle transition event.
     *
     * @param  array<string,mixed>  $context
     */
    public static function forLifecycleTransition(
        ?string $actor,
        ?string $targetTenantId,
        ?string $from,
        string $to,
        ?string $reason,
        array $context = [],
    ): self {
        return new self(
            action: 'tenant.lifecycle.transition',
            category: 'tenant_lifecycle',
            actor: $actor,
            targetTenantId: $targetTenantId,
            from: $from,
            to: $to,
            reason: $reason,
            context: $context,
        );
    }

    /**
     * @return array<string,mixed>
     */
    public function toArray(): array
    {
        return [
            'action' => $this->action,
            'category' => $this->category,
            'actor' => $this->actor,
            'target_tenant_id' => $this->targetTenantId,
            'from' => $this->from,
            'to' => $this->to,
            'reason' => $this->reason,
            'context' => $this->context,
        ];
    }
}
