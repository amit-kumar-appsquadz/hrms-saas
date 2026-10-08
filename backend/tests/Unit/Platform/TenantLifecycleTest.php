<?php

namespace Tests\Unit\Platform;

use App\Models\Tenant;
use App\Platform\Audit\InMemoryPlatformAuditLogStore;
use App\Platform\InitialAdminChecker;
use App\Platform\StubInitialAdminChecker;
use App\Platform\TenantLifecycle;
use App\Platform\TenantLifecycleException;
use PHPUnit\Framework\TestCase;

/**
 * B1-04 — Tenant lifecycle state machine (ADR-008).
 *
 * Pure unit tests (no framework boot, no DB): the service is a pure domain
 * service, so a plain Tenant model instance with a `status` attribute is enough.
 * Covers the exhaustive transition matrix (legal + illegal), the terminal
 * `inactive` state, the activation guard hook, that `pending` does not exist,
 * and that each transition emits exactly one audit event (actor + from→to +
 * reason).
 */
class TenantLifecycleTest extends TestCase
{
    /**
     * The authoritative ADR-008 transition map, mirrored here independently so
     * the test fails loudly if the service's map drifts from ADR-008.
     *
     * @var array<string, list<string>>
     */
    private const EXPECTED_MAP = [
        'provisioning' => ['trial', 'active'],
        'trial' => ['active', 'suspended', 'inactive'],
        'active' => ['suspended', 'inactive'],
        'suspended' => ['active', 'trial', 'inactive'],
        'inactive' => [],
    ];

    private function makeTenant(string $status): Tenant
    {
        $tenant = new Tenant;
        $tenant->status = $status;
        // Give it a key so audit events carry a target_tenant_id.
        $tenant->forceFill(['id' => 42]);

        return $tenant;
    }

    private function makeService(
        ?InMemoryPlatformAuditLogStore $audit = null,
        ?InitialAdminChecker $adminChecker = null,
    ): TenantLifecycle {
        return new TenantLifecycle(
            $audit ?? new InMemoryPlatformAuditLogStore,
            $adminChecker ?? new StubInitialAdminChecker(true),
        );
    }

    public function test_service_map_matches_adr008_exactly(): void
    {
        $this->assertSame(self::EXPECTED_MAP, TenantLifecycle::TRANSITIONS);
    }

    public function test_pending_is_not_a_status_anywhere(): void
    {
        $this->assertNotContains('pending', array_keys(TenantLifecycle::TRANSITIONS));

        foreach (TenantLifecycle::TRANSITIONS as $destinations) {
            $this->assertNotContains('pending', $destinations);
        }

        // Also assert the model's authoritative status set has no `pending`.
        $this->assertNotContains('pending', Tenant::STATUSES);
    }

    /**
     * Every LEGAL transition in the ADR-008 matrix is allowed and applied.
     *
     * @dataProvider legalTransitions
     */
    public function test_every_legal_transition_is_allowed(string $from, string $to): void
    {
        $audit = new InMemoryPlatformAuditLogStore;
        $service = $this->makeService($audit);

        $tenant = $this->makeTenant($from);

        $result = $service->transition($tenant, $to, actor: 'platform-user:1', reason: 'test');

        $this->assertSame($to, $result->status, "{$from} → {$to} should apply");
        $this->assertSame(1, $audit->count(), 'exactly one audit event per transition');
    }

    /**
     * Every ILLEGAL transition (all source/destination pairs not in the map)
     * throws the domain exception. This is exhaustive across every real status
     * pair, so it also covers the representative illegal cases.
     *
     * @dataProvider illegalTransitions
     */
    public function test_every_illegal_transition_throws(string $from, string $to): void
    {
        $audit = new InMemoryPlatformAuditLogStore;
        $service = $this->makeService($audit);

        $tenant = $this->makeTenant($from);

        try {
            $service->transition($tenant, $to, actor: 'platform-user:1', reason: 'test');
            $this->fail("Expected {$from} → {$to} to throw TenantLifecycleException");
        } catch (TenantLifecycleException $e) {
            $this->assertSame(409, $e->statusCode());
            // No audit event on a rejected transition; status unchanged.
            $this->assertSame(0, $audit->count(), 'no audit on rejected transition');
            $this->assertSame($from, $tenant->status, 'status unchanged on rejection');
        }
    }

    public function test_no_transition_out_of_inactive(): void
    {
        $service = $this->makeService();

        foreach (['provisioning', 'trial', 'active', 'suspended', 'inactive'] as $to) {
            $tenant = $this->makeTenant('inactive');

            try {
                $service->transition($tenant, $to);
                $this->fail("inactive → {$to} must be rejected (terminal state)");
            } catch (TenantLifecycleException $e) {
                $this->assertSame(
                    TenantLifecycleException::CODE_TERMINAL_STATE,
                    $e->errorCode(),
                    "inactive → {$to} should carry the terminal-state code"
                );
            }
        }
    }

    public function test_activation_guard_rejects_when_no_initial_admin(): void
    {
        $audit = new InMemoryPlatformAuditLogStore;
        $service = $this->makeService($audit, new StubInitialAdminChecker(false));

        foreach (['trial', 'active'] as $to) {
            $tenant = $this->makeTenant('provisioning');

            try {
                $service->transition($tenant, $to, actor: 'platform-user:1', reason: 'activate');
                $this->fail("provisioning → {$to} must fail the admin guard");
            } catch (TenantLifecycleException $e) {
                $this->assertSame(
                    TenantLifecycleException::CODE_ACTIVATION_GUARD_FAILED,
                    $e->errorCode()
                );
                $this->assertSame('provisioning', $tenant->status);
            }
        }

        $this->assertSame(0, $audit->count(), 'guard failure emits no audit event');
    }

    public function test_activation_passes_when_initial_admin_exists(): void
    {
        $service = $this->makeService(null, new StubInitialAdminChecker(true));

        $tenant = $this->makeTenant('provisioning');
        $service->transition($tenant, 'active', actor: 'platform-user:1', reason: 'activate');

        $this->assertSame('active', $tenant->status);
    }

    public function test_non_activation_transitions_skip_the_admin_guard(): void
    {
        // Admin checker returns false, but suspend/offboard must NOT be gated by it.
        $service = $this->makeService(null, new StubInitialAdminChecker(false));

        $tenant = $this->makeTenant('active');
        $service->transition($tenant, 'suspended', reason: 'policy');

        $this->assertSame('suspended', $tenant->status);
    }

    public function test_audit_event_captures_actor_from_to_and_reason(): void
    {
        $audit = new InMemoryPlatformAuditLogStore;
        $service = $this->makeService($audit);

        $tenant = $this->makeTenant('active');
        $service->transition($tenant, 'suspended', actor: 'platform-user:7', reason: 'non-payment');

        $event = $audit->latest();
        $this->assertNotNull($event);
        $this->assertSame('platform-user:7', $event->actor);
        $this->assertSame('active', $event->from);
        $this->assertSame('suspended', $event->to);
        $this->assertSame('non-payment', $event->reason);
        $this->assertSame('42', $event->targetTenantId);
        $this->assertSame('tenant_lifecycle', $event->category);
        $this->assertSame('tenant.lifecycle.transition', $event->action);
    }

    public function test_can_transition_reflects_the_map(): void
    {
        $service = $this->makeService();

        $this->assertTrue($service->canTransition('provisioning', 'trial'));
        $this->assertTrue($service->canTransition('suspended', 'trial'));
        $this->assertFalse($service->canTransition('provisioning', 'suspended'));
        $this->assertFalse($service->canTransition('inactive', 'active'));
        $this->assertFalse($service->canTransition('active', 'provisioning'));
    }

    /**
     * @return iterable<string, array{0:string,1:string}>
     */
    public static function legalTransitions(): iterable
    {
        foreach (self::EXPECTED_MAP as $from => $destinations) {
            foreach ($destinations as $to) {
                yield "{$from} -> {$to}" => [$from, $to];
            }
        }
    }

    /**
     * Every (from, to) pair over the real status set that is NOT in the map,
     * including self-transitions (e.g. active → active).
     *
     * @return iterable<string, array{0:string,1:string}>
     */
    public static function illegalTransitions(): iterable
    {
        $statuses = array_keys(self::EXPECTED_MAP);

        foreach ($statuses as $from) {
            foreach ($statuses as $to) {
                if (in_array($to, self::EXPECTED_MAP[$from], true)) {
                    continue;
                }
                yield "{$from} -> {$to}" => [$from, $to];
            }
        }
    }
}
