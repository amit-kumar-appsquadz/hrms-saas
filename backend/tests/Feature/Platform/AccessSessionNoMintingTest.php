<?php

namespace Tests\Feature\Platform;

use App\Platform\AccessSession;
use ReflectionClass;
use Tests\TestCase;

/**
 * B1-10 — assert the ABSENCE of any tenant-token minting / write-impersonation
 * path (human decision E-1, ADR-007 §6).
 *
 * B1 is FOUNDATIONS ONLY. The access-session model proves the SHAPE + the
 * invariants of the read-only cross-plane path, but NOTHING here may mint a
 * usable tenant access token, perform write impersonation, or issue a tenant
 * credential. Live read-only token issuance + double-audit wiring are B3 behind
 * SEC-3. This test is a tripwire: if someone later adds a minting method to the
 * B1 model, it fails.
 */
class AccessSessionNoMintingTest extends TestCase
{
    /**
     * Method name fragments that would indicate token minting / credential
     * issuance / impersonation sneaking into the B1 state model.
     *
     * @var array<int, string>
     */
    private const FORBIDDEN_METHOD_FRAGMENTS = [
        'mint',
        'issuetoken',
        'issueaccesstoken',
        'issuecredential',
        'createtoken',
        'accesstoken',
        'bearertoken',
        'tenanttoken',
        'impersonate',
        'assume',
        'grantwrite',
        'elevate',
        'escalate',
    ];

    public function test_access_session_model_exposes_no_minting_or_impersonation_method(): void
    {
        $reflection = new ReflectionClass(AccessSession::class);

        // Only methods DECLARED on AccessSession itself (ignore inherited
        // Eloquent plumbing like createToken on unrelated traits — none here).
        $declared = array_filter(
            $reflection->getMethods(),
            fn (\ReflectionMethod $m) => $m->getDeclaringClass()->getName() === AccessSession::class
        );

        foreach ($declared as $method) {
            $name = strtolower($method->getName());

            foreach (self::FORBIDDEN_METHOD_FRAGMENTS as $fragment) {
                $this->assertStringNotContainsString(
                    $fragment,
                    $name,
                    "AccessSession must not expose a `{$method->getName()}` method in B1 "
                    .'(no tenant-token minting / write impersonation — E-1, ADR-007 §6).'
                );
            }
        }

        $this->assertTrue(true);
    }

    public function test_access_session_does_not_use_the_sanctum_api_token_trait(): void
    {
        // HasApiTokens would introduce createToken() — forbidden in B1.
        $traits = class_uses_recursive(AccessSession::class);

        $this->assertArrayNotHasKey(
            'Laravel\\Sanctum\\HasApiTokens',
            $traits,
            'AccessSession must not carry an API-token trait in B1.'
        );
    }

    public function test_start_returns_state_only_and_never_a_token(): void
    {
        // The construction entry point returns the model itself (STATE), never
        // a string/credential. There is no second "token" return value.
        $session = AccessSession::start(1, 1, 'read-only support access');

        $this->assertInstanceOf(AccessSession::class, $session);

        // No token-bearing attribute exists on the produced state.
        foreach (['token', 'access_token', 'secret', 'tenant_token'] as $attr) {
            $this->assertNull(
                $session->getAttribute($attr),
                "AccessSession state must not carry a `{$attr}` attribute in B1."
            );
        }
    }

    public function test_no_write_mode_is_reachable(): void
    {
        // The only mode is read_only; there is no API to request a write mode.
        $this->assertSame('read_only', AccessSession::MODE_READ_ONLY);

        $session = AccessSession::start(1, 1, 'reading');
        $this->assertSame('read_only', $session->mode);
    }
}
