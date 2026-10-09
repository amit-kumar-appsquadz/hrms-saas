<?php

namespace App\Auth;

/**
 * TokenAudience — the plane audiences and the minimal, self-contained token
 * issue/verify primitive used to PROVE the plane boundary (ADR-007 §1, §3).
 *
 * ADR-007 §1 enumerates the plane boundary, in order:
 *   1. identity store (platform_users vs users),
 *   2. token AUDIENCE (`platform` vs `tenant`)  ← this enum,
 *   3. authorization namespace (platform.* vs tenant.*),
 *   4. tenant context,
 *   5. explicit per-endpoint checks.
 *
 * The audience is a SERVER-SIDE claim, independent of path/host: even if a request
 * reaches a platform route carrying a tenant-audience token (or vice versa), the
 * guard/middleware rejects it on the audience mismatch alone (ADR-007 §1 final para).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * Scope note (B1 = foundations only, B1_PLAN §0): B1 ships only a MINIMAL,
 * test-only token primitive to exercise the boundary. It is NOT the production
 * token format. Full login/MFA token issuance (Sanctum/JWT) is B2. Deliberately
 * NO new signing dependency is added here; the token is HMAC-signed with the
 * application key (`APP_KEY`) so tests run with zero cloud calls and zero extra
 * packages. When B2 swaps in the real scheme, the `audience` claim and the
 * {@see self::verify()} contract are the stable seam.
 * ───────────────────────────────────────────────────────────────────────────
 */
enum TokenAudience: string
{
    case PLATFORM = 'platform';
    case TENANT = 'tenant';

    /**
     * Mint a minimal signed token for this audience.
     *
     * Format: base64url(payload_json) . "." . base64url(hmac_sha256(payload_json)).
     * The payload always carries an `aud` claim (this audience) and a `sub`
     * (subject identifier, e.g. the platform user id). Extra claims may be merged
     * in (e.g. a future `platform_access` flag for access-session tokens — B3).
     *
     * @param  int|string  $subject  Subject id (platform_users.id for platform tokens).
     * @param  array<string, mixed>  $claims  Extra claims to embed.
     */
    public function issueToken(int|string $subject, array $claims = []): string
    {
        $payload = array_merge($claims, [
            'aud' => $this->value,
            'sub' => (string) $subject,
            'iat' => time(),
        ]);

        $json = json_encode($payload, JSON_THROW_ON_ERROR);
        $body = self::b64urlEncode($json);
        $sig = self::b64urlEncode(self::sign($json));

        return $body.'.'.$sig;
    }

    /**
     * Verify a token's signature and decode its claims. Returns null on ANY
     * failure (malformed, bad signature). Does NOT itself check the audience —
     * the caller (guard/middleware) compares `aud` against the expected plane so
     * the rejection is explicit and testable.
     *
     * @return array<string, mixed>|null
     */
    public static function verify(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return null;
        }

        [$body, $sig] = $parts;

        $json = self::b64urlDecode($body);
        if ($json === null) {
            return null;
        }

        $expected = self::sign($json);
        $actual = self::b64urlDecode($sig);
        if ($actual === null || ! hash_equals($expected, $actual)) {
            return null;
        }

        $claims = json_decode($json, true);
        if (! is_array($claims) || ! isset($claims['aud'])) {
            return null;
        }

        return $claims;
    }

    /**
     * Resolve the audience enum from a verified claim set, or null if the `aud`
     * claim is absent/unknown.
     *
     * @param  array<string, mixed>  $claims
     */
    public static function fromClaims(array $claims): ?self
    {
        $aud = $claims['aud'] ?? null;

        return is_string($aud) ? self::tryFrom($aud) : null;
    }

    /**
     * True when the given verified claims match THIS audience. This is the
     * server-side plane check — path/host independent.
     *
     * @param  array<string, mixed>  $claims
     */
    public function matches(array $claims): bool
    {
        return self::fromClaims($claims) === $this;
    }

    /**
     * HMAC-SHA256 over the raw payload JSON using the application key.
     * (B1 test-only signer; replaced by the B2 production scheme.)
     */
    private static function sign(string $payloadJson): string
    {
        return hash_hmac('sha256', $payloadJson, self::key(), true);
    }

    private static function key(): string
    {
        $key = (string) config('app.key');

        // Laravel stores the key as "base64:...."; decode to raw bytes when so.
        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);
            if ($decoded !== false) {
                return $decoded;
            }
        }

        return $key;
    }

    private static function b64urlEncode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $encoded): ?string
    {
        $decoded = base64_decode(strtr($encoded, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }
}
