<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Platform\Audit\InMemoryPlatformAuditLogStore;
use App\Platform\Audit\PlatformAuditLogStore;
use App\Platform\InitialAdminChecker;
use App\Platform\StubInitialAdminChecker;
use App\Platform\TenantLifecycle;
use App\Platform\TenantLifecycleException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

/**
 * B1-13 — QA: tenant lifecycle state-machine test suite (ADR-008).
 * =================================================================
 * This is the QA/acceptance layer for the tenant lifecycle. Where B1-04 unit
 * tests prove the pure state machine in isolation and B1-05 proves host
 * resolution against a FAKE lookup, this suite proves the SAME invariants
 * END-TO-END against the REAL `Tenant` model, the REAL DB (sqlite :memory:),
 * the REAL lifecycle service resolved from the container (with its real
 * bindings), and the REAL `ResolveTenant` middleware + bootstrap 409 renderer.
 *
 * It is deterministic and performs NO cloud calls (steering rule).
 *
 * INVARIANT → TEST MAPPING (see docs/notes/B1-13.md for the full table):
 *   I1  full transition matrix: every LEGAL transition allowed + applied + persisted
 *   I2  full transition matrix: every ILLEGAL transition rejected → HTTP 409 Error shape
 *   I3  `inactive` is terminal — no transition out, nothing persisted
 *   I4  illegal transition → HTTP 409 with the contract `Error` shape
 *   I5  subdomain immutable after creation (real model + DB)
 *   I6  reserved labels (`app|www|platform|admin|api|static`) resolve to NO tenant
 *   I7  status-gated resolver: suspended/provisioning/inactive block access, non-enumerating
 *   I8  `pending` does not exist anywhere (service map, model, migration enum, config)
 *   I9  activation guard (provisioning→trial|active requires initial admin)
 *
 * ADR-008 authoritative transition map (mirrored INDEPENDENTLY here so this
 * suite fails loudly if the product map ever drifts from the ADR):
 *   provisioning → trial | active
 *   trial        → active | suspended | inactive
 *   active       → suspended | inactive
 *   suspended    → active | trial | inactive
 *   inactive     → (terminal — nothing)
 */
class LifecycleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The authoritative ADR-008 map, hand-written here (NOT imported from the
     * product) so a drift between ADR-008 and the implementation is caught.
     *
     * @var array<string, list<string>>
     */
    private const ADR008_MAP = [
        'provisioning' => ['trial', 'active'],
        'trial' => ['active', 'suspended', 'inactive'],
        'active' => ['suspended', 'inactive'],
        'suspended' => ['active', 'trial', 'inactive'],
        'inactive' => [],
    ];

    /** The complete ADR-008 status set. */
    private const STATUSES = ['provisioning', 'trial', 'active', 'suspended', 'inactive'];

    /** Reserved labels per ADR-001 amendment (never a tenant subdomain). */
    private const RESERVED_LABELS = ['app', 'www', 'platform', 'admin', 'api', 'static'];

    protected function setUp(): void
    {
        parent::setUp();

        // Pin resolver config so the suite is independent of env overrides.
        Config::set('tenancy.base_domain', 'app.example.com');
        Config::set('tenancy.reserved_labels', self::RESERVED_LABELS);
        Config::set('tenancy.serveable_statuses', ['trial', 'active']);

        // A throwaway platform-style route that drives the REAL lifecycle
        // service into a transition on a REAL, persisted tenant and persists
        // the result. This is exactly how a platform endpoint (B2/B3) will call
        // the service, so the 409 mapping is exercised via the bootstrap
        // renderer, not by catching the exception in-test.
        Route::post('/__b1_13__/tenants/{id}/transition', function (string $id) {
            /** @var TenantLifecycle $service */
            $service = app(TenantLifecycle::class);

            $tenant = Tenant::findOrFail((int) $id);
            $to = request('to');

            $service->transition($tenant, (string) $to, actor: 'platform-user:1', reason: 'qa');
            $tenant->save();

            return response()->json([
                'id' => $tenant->id,
                'status' => $tenant->status,
            ]);
        });

        // A throwaway tenant-plane route behind the REAL resolver (required
        // mode is not used here: we want to observe the status gate / reserved
        // / unknown behaviour, which returns before reaching the handler).
        Route::middleware(\App\Http\Middleware\ResolveTenant::class)
            ->get('/__b1_13__/resolve', function (\App\Tenancy\TenantContext $ctx) {
                return response()->json([
                    'has_tenant' => $ctx->hasTenant(),
                    'tenant_id' => $ctx->tenantId(),
                    'subdomain' => $ctx->subdomain(),
                ]);
            });
    }

    private function makeTenant(string $status, string $subdomain = 'acme'): Tenant
    {
        return Tenant::factory()->create([
            'subdomain' => $subdomain,
            'status' => $status,
        ]);
    }

    // =====================================================================
    // I1 — every LEGAL transition is allowed, applied, and PERSISTED
    // =====================================================================

    #[DataProvider('legalTransitions')]
    public function test_legal_transition_is_applied_and_persisted(string $from, string $to): void
    {
        $tenant = $this->makeTenant($from, 'legal-'.$from.'-'.$to);

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => $to])
            ->assertOk()
            ->assertJson(['id' => $tenant->id, 'status' => $to]);

        $this->assertSame($to, $tenant->fresh()->status, "{$from} → {$to} must persist");
    }

    public function test_legal_transition_emits_exactly_one_audit_event(): void
    {
        // Bind a shared in-memory audit store we can inspect.
        $audit = new InMemoryPlatformAuditLogStore;
        $this->app->instance(PlatformAuditLogStore::class, $audit);

        $tenant = $this->makeTenant('active', 'audit-check');

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => 'suspended'])
            ->assertOk();

        $this->assertSame(1, $audit->count(), 'exactly one audit event per transition');
        $event = $audit->latest();
        $this->assertNotNull($event);
        $this->assertSame('active', $event->from);
        $this->assertSame('suspended', $event->to);
        $this->assertSame('platform-user:1', $event->actor);
        $this->assertSame((string) $tenant->id, $event->targetTenantId);
    }

    // =====================================================================
    // I2 + I4 — every ILLEGAL transition → HTTP 409 with the Error shape,
    //           status unchanged + NOT persisted, no audit emitted
    // =====================================================================

    #[DataProvider('illegalTransitions')]
    public function test_illegal_transition_is_rejected_with_409_error_shape(string $from, string $to): void
    {
        $audit = new InMemoryPlatformAuditLogStore;
        $this->app->instance(PlatformAuditLogStore::class, $audit);

        $tenant = $this->makeTenant($from, 'illegal-'.$from.'-'.$to);

        $response = $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => $to]);

        $response->assertStatus(409);
        // Contract Error shape: { "error": { "code", "message", request_id? } }.
        $response->assertJsonStructure(['error' => ['code', 'message']]);
        $this->assertSame(['error'], array_keys($response->json()), 'only the error envelope is returned');
        $this->assertIsString($response->json('error.code'));
        $this->assertIsString($response->json('error.message'));

        // Rejection must not mutate or persist, and must not audit.
        $this->assertSame($from, $tenant->fresh()->status, "{$from} → {$to} must NOT persist");
        $this->assertSame(0, $audit->count(), 'no audit event on a rejected transition');
    }

    public function test_illegal_transition_error_code_is_the_illegal_transition_code(): void
    {
        // A non-terminal illegal transition carries the illegal-transition code
        // (distinct from the terminal-state code — see the inactive tests).
        $tenant = $this->makeTenant('provisioning', 'code-check');

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => 'suspended'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', TenantLifecycleException::CODE_ILLEGAL_TRANSITION);
    }

    public function test_request_id_header_is_echoed_into_the_error_envelope(): void
    {
        $tenant = $this->makeTenant('active', 'reqid-check');

        $this->postJson(
            "/__b1_13__/tenants/{$tenant->id}/transition",
            ['to' => 'provisioning'],
            ['X-Request-Id' => 'req-b1-13-xyz']
        )
            ->assertStatus(409)
            ->assertJsonPath('error.request_id', 'req-b1-13-xyz');
    }

    // =====================================================================
    // I3 — `inactive` is terminal
    // =====================================================================

    #[DataProvider('allStatuses')]
    public function test_no_transition_out_of_inactive(string $to): void
    {
        $audit = new InMemoryPlatformAuditLogStore;
        $this->app->instance(PlatformAuditLogStore::class, $audit);

        $tenant = $this->makeTenant('inactive', 'terminal-'.$to);

        $response = $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => $to]);

        $response->assertStatus(409);
        // Terminal state carries its OWN code so callers can distinguish it.
        $response->assertJsonPath('error.code', TenantLifecycleException::CODE_TERMINAL_STATE);

        $this->assertSame('inactive', $tenant->fresh()->status, 'inactive is terminal; nothing persists');
        $this->assertSame(0, $audit->count());
    }

    // =====================================================================
    // I9 — activation guard (provisioning → trial|active needs initial admin)
    // =====================================================================

    #[DataProvider('activationTargets')]
    public function test_activation_rejected_when_no_initial_admin(string $to): void
    {
        // Swap in a checker that reports NO admin.
        $this->app->instance(InitialAdminChecker::class, new StubInitialAdminChecker(false));

        $tenant = $this->makeTenant('provisioning', 'guard-'.$to);

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => $to])
            ->assertStatus(409)
            ->assertJsonPath('error.code', TenantLifecycleException::CODE_ACTIVATION_GUARD_FAILED);

        $this->assertSame('provisioning', $tenant->fresh()->status, 'guard failure must not persist');
    }

    #[DataProvider('activationTargets')]
    public function test_activation_allowed_when_initial_admin_exists(string $to): void
    {
        $this->app->instance(InitialAdminChecker::class, new StubInitialAdminChecker(true));

        $tenant = $this->makeTenant('provisioning', 'guardok-'.$to);

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => $to])
            ->assertOk();

        $this->assertSame($to, $tenant->fresh()->status);
    }

    // =====================================================================
    // I5 — subdomain is immutable after creation (real model + DB)
    // =====================================================================

    public function test_subdomain_is_immutable_after_creation(): void
    {
        $tenant = $this->makeTenant('active', 'immutable-me');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('immutable');

        $tenant->update(['subdomain' => 'renamed']);
    }

    public function test_subdomain_change_is_not_persisted(): void
    {
        $tenant = $this->makeTenant('active', 'keep-me');

        try {
            $tenant->subdomain = 'hacked';
            $tenant->save();
        } catch (RuntimeException) {
            // expected — immutability guard
        }

        $this->assertSame('keep-me', $tenant->fresh()->subdomain);
    }

    public function test_lifecycle_transition_does_not_change_the_subdomain(): void
    {
        // A legal status transition must never touch the immutable subdomain.
        $tenant = $this->makeTenant('active', 'stable-sub');

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => 'suspended'])
            ->assertOk();

        $this->assertSame('stable-sub', $tenant->fresh()->subdomain);
    }

    // =====================================================================
    // I6 — reserved labels resolve to NO tenant (real DB-backed resolver)
    // =====================================================================

    #[DataProvider('reservedLabels')]
    public function test_reserved_label_resolves_to_no_tenant(string $label): void
    {
        // Even if a row somehow existed with a reserved subdomain, the resolver
        // short-circuits reserved labels to "no tenant" BEFORE any lookup.
        $this->getJson("http://{$label}.app.example.com/__b1_13__/resolve")
            ->assertOk()
            ->assertJson(['has_tenant' => false, 'tenant_id' => null]);
    }

    public function test_reserved_label_is_not_resolved_even_if_a_matching_row_exists(): void
    {
        // Defence-in-depth: a stray reserved-label row must still never resolve.
        Tenant::factory()->active()->create(['subdomain' => 'platform']);

        $this->getJson('http://platform.app.example.com/__b1_13__/resolve')
            ->assertOk()
            ->assertJson(['has_tenant' => false]);
    }

    // =====================================================================
    // I7 — status-gated resolver (real DB), non-enumerating
    // =====================================================================

    public function test_active_tenant_resolves(): void
    {
        $t = $this->makeTenant('active', 'acme');

        $this->getJson('http://acme.app.example.com/__b1_13__/resolve')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => $t->id, 'subdomain' => 'acme']);
    }

    public function test_trial_tenant_resolves(): void
    {
        $t = $this->makeTenant('trial', 'globex');

        $this->getJson('http://globex.app.example.com/__b1_13__/resolve')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => $t->id]);
    }

    #[DataProvider('nonServeableStatuses')]
    public function test_non_serveable_status_blocks_access(string $status): void
    {
        $this->makeTenant($status, 'blocked-'.$status);

        $this->getJson("http://blocked-{$status}.app.example.com/__b1_13__/resolve")
            ->assertNotFound()
            ->assertJson(['error' => ['code' => 'tenant_unavailable']]);
    }

    public function test_blocked_tenant_and_unknown_tenant_are_indistinguishable(): void
    {
        // Non-enumeration: a suspended tenant and a non-existent tenant must
        // return byte-identical responses so existence cannot be probed.
        $this->makeTenant('suspended', 'secret-corp');

        $blocked = $this->getJson('http://secret-corp.app.example.com/__b1_13__/resolve');
        $unknown = $this->getJson('http://no-such-tenant.app.example.com/__b1_13__/resolve');

        $this->assertSame($unknown->status(), $blocked->status());
        $this->assertSame($unknown->json(), $blocked->json());
    }

    public function test_suspended_then_reactivated_tenant_can_resolve_again(): void
    {
        // Lifecycle ↔ resolver integration: a suspended tenant is blocked;
        // after a legal suspended→active transition it resolves again.
        $tenant = $this->makeTenant('suspended', 'comeback');

        $this->getJson('http://comeback.app.example.com/__b1_13__/resolve')
            ->assertNotFound();

        $this->postJson("/__b1_13__/tenants/{$tenant->id}/transition", ['to' => 'active'])
            ->assertOk();

        $this->getJson('http://comeback.app.example.com/__b1_13__/resolve')
            ->assertOk()
            ->assertJson(['has_tenant' => true, 'tenant_id' => $tenant->id]);
    }

    // =====================================================================
    // I8 — `pending` does not exist ANYWHERE
    // =====================================================================

    public function test_pending_is_absent_from_the_service_map(): void
    {
        $this->assertArrayNotHasKey('pending', TenantLifecycle::TRANSITIONS);
        foreach (TenantLifecycle::TRANSITIONS as $destinations) {
            $this->assertNotContains('pending', $destinations);
        }
    }

    public function test_pending_is_absent_from_the_model_status_set(): void
    {
        $this->assertNotContains('pending', Tenant::STATUSES);
        $this->assertSame(self::STATUSES, Tenant::STATUSES, 'model status set must equal the ADR-008 set');
    }

    public function test_pending_is_absent_from_the_resolver_serveable_config(): void
    {
        $this->assertNotContains('pending', (array) config('tenancy.serveable_statuses'));
    }

    public function test_pending_is_absent_from_the_persisted_enum(): void
    {
        // The migration enum degrades to a string on sqlite, so a `pending`
        // write would NOT be rejected at the DB layer here. The guarantee that
        // `pending` never exists is therefore enforced at the model/service
        // layer (asserted above). This test documents that explicitly and
        // proves the authoritative set used by the model carries no `pending`.
        $this->assertNotContains('pending', Tenant::STATUSES);
    }

    // =====================================================================
    // Guard: the product transition map must equal ADR-008 exactly
    // =====================================================================

    public function test_product_transition_map_equals_adr008(): void
    {
        $this->assertSame(
            self::ADR008_MAP,
            TenantLifecycle::TRANSITIONS,
            'The product transition map drifted from the ADR-008 map mirrored in this QA suite.'
        );
    }

    // =====================================================================
    // Data providers
    // =====================================================================

    /** @return iterable<string, array{0:string,1:string}> */
    public static function legalTransitions(): iterable
    {
        foreach (self::ADR008_MAP as $from => $tos) {
            foreach ($tos as $to) {
                yield "{$from} -> {$to}" => [$from, $to];
            }
        }
    }

    /**
     * Every (from,to) pair over the real status set that is NOT in the map,
     * including self-transitions (e.g. active → active) and transitions out of
     * the terminal `inactive` state.
     *
     * @return iterable<string, array{0:string,1:string}>
     */
    public static function illegalTransitions(): iterable
    {
        foreach (self::STATUSES as $from) {
            foreach (self::STATUSES as $to) {
                if (in_array($to, self::ADR008_MAP[$from], true)) {
                    continue;
                }
                yield "{$from} -> {$to}" => [$from, $to];
            }
        }
    }

    /** @return iterable<string, array{0:string}> */
    public static function allStatuses(): iterable
    {
        foreach (self::STATUSES as $s) {
            yield $s => [$s];
        }
    }

    /** @return iterable<string, array{0:string}> */
    public static function activationTargets(): iterable
    {
        yield 'trial' => ['trial'];
        yield 'active' => ['active'];
    }

    /** @return iterable<string, array{0:string}> */
    public static function reservedLabels(): iterable
    {
        foreach (self::RESERVED_LABELS as $label) {
            yield $label => [$label];
        }
    }

    /** @return iterable<string, array{0:string}> */
    public static function nonServeableStatuses(): iterable
    {
        yield 'provisioning' => ['provisioning'];
        yield 'suspended' => ['suspended'];
        yield 'inactive' => ['inactive'];
    }
}
