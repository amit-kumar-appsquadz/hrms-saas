<?php

namespace Tests\Unit\Auth;

use App\Auth\TokenAudience;
use Tests\TestCase;

/**
 * B1-03 — TokenAudience primitive unit tests.
 *
 * The audience is the server-side plane claim (ADR-007 §1). These tests prove
 * issue→verify round-trips, that tampering is rejected, and that `matches()`
 * distinguishes the two planes.
 */
class TokenAudienceTest extends TestCase
{
    public function test_issue_and_verify_round_trip_carries_audience_and_subject(): void
    {
        $token = TokenAudience::PLATFORM->issueToken(42);

        $claims = TokenAudience::verify($token);

        $this->assertIsArray($claims);
        $this->assertSame('platform', $claims['aud']);
        $this->assertSame('42', $claims['sub']);
    }

    public function test_platform_audience_matches_only_platform_claims(): void
    {
        $platform = TokenAudience::verify(TokenAudience::PLATFORM->issueToken(1));
        $tenant = TokenAudience::verify(TokenAudience::TENANT->issueToken(1));

        $this->assertTrue(TokenAudience::PLATFORM->matches($platform));
        $this->assertFalse(TokenAudience::PLATFORM->matches($tenant));

        $this->assertTrue(TokenAudience::TENANT->matches($tenant));
        $this->assertFalse(TokenAudience::TENANT->matches($platform));
    }

    public function test_tampered_token_fails_verification(): void
    {
        $token = TokenAudience::PLATFORM->issueToken(7);

        [$body, $sig] = explode('.', $token);

        // Tamper the PAYLOAD body: the signature no longer matches the content.
        $tamperedBody = rtrim(strtr(base64_encode(
            str_replace('"sub":"7"', '"sub":"999"', base64_decode(strtr($body, '-_', '+/')))
        ), '+/', '-_'), '=');

        $this->assertNull(TokenAudience::verify($tamperedBody.'.'.$sig));

        // And a token with a wholly different signature is rejected.
        $this->assertNull(TokenAudience::verify($body.'.'.$sig.'extra'));
    }

    public function test_malformed_token_fails_verification(): void
    {
        $this->assertNull(TokenAudience::verify('not-a-token'));
        $this->assertNull(TokenAudience::verify(''));
        $this->assertNull(TokenAudience::verify('only.one.extra.dots'));
    }

    public function test_from_claims_resolves_audience_enum(): void
    {
        $claims = TokenAudience::verify(TokenAudience::PLATFORM->issueToken(5));
        $this->assertSame(TokenAudience::PLATFORM, TokenAudience::fromClaims($claims));

        $this->assertNull(TokenAudience::fromClaims(['aud' => 'bogus']));
        $this->assertNull(TokenAudience::fromClaims([]));
    }
}
