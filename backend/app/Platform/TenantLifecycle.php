<?php

namespace App\Platform;

use App\Models\Tenant;
use App\Platform\Audit\PlatformAuditEvent;
use App\Platform\Audit\PlatformAuditLogStore;

/**
 * Tenant lifecycle state machine (ADR-008) — a PURE domain service.
 *
 * It owns the authoritative set of allowed transitions and the activation
 * guards, enforces them, mutates the given {@see Tenant} model's status, and
 * emits a platform-audit event per transition. It has no knowledge of HTTP,
 * controllers, routing, or persistence beyond setting the model attribute — the
 * caller (a platform-plane endpoint in B2/B3) is responsible for persistence,
 * authorization, and the platform-only boundary.
 *
 * ADR-008 is authoritative for the transition map:
 *   provisioning → trial | active            (activation; guarded)
 *   trial        → active | suspended | inactive
 *   active       → suspended | inactive
 *   suspended    → active | trial | inactive
 *   inactive     → (terminal — NO transition out)
 *
 * `pending` is NOT a status and does not appear anywhere (ADR-008 rejected it as
 * a synonym of `provisioning`).
 *
 * Any illegal transition throws {@see TenantLifecycleException}, which maps to
 * HTTP 409 Conflict with the contract `Error` shape.
 *
 * SECURITY: lifecycle writes are platform-plane only. This service does not
 * enforce that boundary itself; it is enforced when wired to endpoints in
 * B2/B3 (platform audience + `platform.tenant.*` permission). It must only ever
 * be called from platform context.
 */
class TenantLifecycle
{
    /**
     * Authoritative ADR-008 transition map: status => allowed destinations.
     *
     * `inactive` maps to an empty list: it is the terminal state, so NO
     * transition out of it is permitted (a re-signed customer is a brand-new
     * provisioning, per ADR-008).
     *
     * @var array<string, list<string>>
     */
    public const TRANSITIONS = [
        'provisioning' => ['trial', 'active'],
        'trial' => ['active', 'suspended', 'inactive'],
        'active' => ['suspended', 'inactive'],
        'suspended' => ['active', 'trial', 'inactive'],
        'inactive' => [],
    ];

    /**
     * Destination statuses that count as "activation" and therefore run the
     * activation guards (provisioning complete + initial admin exists). Per
     * ADR-008 these are the activation targets out of `provisioning`.
     *
     * @var list<string>
     */
    public const ACTIVATION_TARGETS = ['trial', 'active'];

    public function __construct(
        private readonly PlatformAuditLogStore $auditLog,
        private readonly InitialAdminChecker $initialAdminChecker,
    ) {}

    /**
     * Whether `$from → $to` is a legal transition per the ADR-008 map.
     * Guards (activation preconditions) are evaluated separately in
     * {@see transition()}; this only answers the pure map question.
     */
    public function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    /**
     * Allowed destination statuses from the given status.
     *
     * @return list<string>
     */
    public function allowedTransitionsFrom(string $from): array
    {
        return self::TRANSITIONS[$from] ?? [];
    }

    /**
     * Apply a lifecycle transition to the tenant.
     *
     * Validates the transition against the ADR-008 map, runs activation guards
     * when activating out of `provisioning`, mutates the tenant's status, and
     * emits a platform-audit event (actor + from→to + reason). The caller
     * persists the model.
     *
     * @param  Tenant  $tenant  the tenant to transition (its current status is the source)
     * @param  string  $to  destination status
     * @param  string|null  $actor  platform actor performing the write (for audit)
     * @param  string|null  $reason  reason recorded with the transition (for audit)
     *
     * @throws TenantLifecycleException on any illegal transition or failed guard (→ 409)
     */
    public function transition(Tenant $tenant, string $to, ?string $actor = null, ?string $reason = null): Tenant
    {
        $from = (string) $tenant->status;

        $this->assertTransitionAllowed($from, $to);
        $this->assertGuards($tenant, $from, $to);

        $tenant->status = $to;

        $this->emitAudit($tenant, $from, $to, $actor, $reason);

        return $tenant;
    }

    /**
     * @throws TenantLifecycleException
     */
    private function assertTransitionAllowed(string $from, string $to): void
    {
        // No-op / unknown destinations are illegal (destination must be a real
        // ADR-008 status and must be in the allowed set for the source).
        if (! array_key_exists($from, self::TRANSITIONS)) {
            throw TenantLifecycleException::illegalTransition($from, $to);
        }

        // Terminal state: anything out of `inactive` is rejected with a
        // dedicated code so callers can distinguish "terminal" from a plain
        // illegal transition.
        if (self::TRANSITIONS[$from] === []) {
            throw TenantLifecycleException::terminalState($from, $to);
        }

        if (! $this->canTransition($from, $to)) {
            throw TenantLifecycleException::illegalTransition($from, $to);
        }
    }

    /**
     * Activation guards (ADR-008): activating a tenant out of `provisioning`
     * requires provisioning to be complete AND an initial admin to exist.
     *
     * The initial-admin existence check is delegated to {@see InitialAdminChecker},
     * which is STUBBED until B4 (no tenant `users` table yet). The guard HOOK is
     * real and wired here.
     *
     * @throws TenantLifecycleException
     */
    private function assertGuards(Tenant $tenant, string $from, string $to): void
    {
        if ($from !== 'provisioning' || ! in_array($to, self::ACTIVATION_TARGETS, true)) {
            return;
        }

        // Provisioning-complete gate. In B1 the only observable signal is the
        // status itself (already `provisioning`); richer provisioning-progress
        // checks arrive with onboarding (ADR-008 onboarding flow). This hook is
        // the seam for that check.
        // (No additional provisioning-progress fields exist in B1 to assert.)

        // Initial-admin gate (STUBBED until B4).
        if (! $this->initialAdminChecker->hasInitialAdmin($tenant)) {
            throw TenantLifecycleException::activationGuardFailed(
                "Cannot activate tenant to '{$to}': no initial admin exists."
            );
        }
    }

    private function emitAudit(Tenant $tenant, string $from, string $to, ?string $actor, ?string $reason): void
    {
        $this->auditLog->record(
            PlatformAuditEvent::forLifecycleTransition(
                actor: $actor,
                targetTenantId: $tenant->getKey() === null ? null : (string) $tenant->getKey(),
                from: $from,
                to: $to,
                reason: $reason,
            )
        );
    }
}
