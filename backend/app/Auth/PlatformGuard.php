<?php

namespace App\Auth;

use App\Models\Platform\PlatformUser;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;

/**
 * PlatformGuard — authentication guard for the PLATFORM plane (ADR-007 §1, §3).
 *
 * Enforces the first two legs of the server-side plane boundary:
 *   (1) IDENTITY STORE — authenticates ONLY against the `platform_users` identity
 *       store, via a user provider bound to {@see PlatformUser}. A tenant user
 *       (row in `users`) has no row here, so it can never authenticate through
 *       this guard even with an otherwise-valid token — the `sub` simply does not
 *       resolve to a platform user.
 *   (2) TOKEN AUDIENCE — rejects any bearer token whose `aud` claim is not
 *       `platform`. A `tenant`-audience token is rejected here regardless of the
 *       route/path/host it arrived on (ADR-007 §1: boundary is server-side, not
 *       the URL).
 *
 * The guard is stateless (bearer-token based) — appropriate for an API plane and
 * for the B1 test-only token primitive. Full session/login/MFA is B2.
 *
 * Scope: B1 wires the guard + audience check only. It does NOT implement login,
 * password verification endpoints, or MFA (B2).
 */
class PlatformGuard implements Guard
{
    protected ?Authenticatable $user = null;

    /**
     * Memoized "already attempted resolution" flag so a failed resolve is not
     * retried on every ->user() call within a request.
     */
    protected bool $resolved = false;

    public function __construct(
        protected UserProvider $provider,
        protected Request $request,
    ) {}

    /**
     * The plane this guard serves. The audience check compares the token's `aud`
     * claim against this value — anything else is rejected.
     */
    public function audience(): TokenAudience
    {
        return TokenAudience::PLATFORM;
    }

    public function check(): bool
    {
        return $this->user() !== null;
    }

    public function guest(): bool
    {
        return ! $this->check();
    }

    /**
     * Resolve the authenticated platform user from the bearer token, enforcing
     * the audience and identity-store checks. Returns null (not an exception) on
     * any failure so middleware decides the HTTP response.
     */
    public function user(): ?Authenticatable
    {
        if ($this->resolved) {
            return $this->user;
        }

        $this->resolved = true;

        $token = $this->bearerToken();
        if ($token === null) {
            return $this->user = null;
        }

        $claims = TokenAudience::verify($token);
        if ($claims === null) {
            return $this->user = null;
        }

        // (2) AUDIENCE: reject anything that is not a platform-audience token.
        //     This is where a `tenant`-audience token is refused by the platform
        //     plane — independent of path/host.
        if (! $this->audience()->matches($claims)) {
            return $this->user = null;
        }

        $subject = $claims['sub'] ?? null;
        if ($subject === null) {
            return $this->user = null;
        }

        // (1) IDENTITY STORE: resolve ONLY against platform_users. A tenant user
        //     id will not resolve to a platform user here.
        $user = $this->provider->retrieveById($subject);

        if (! $user instanceof PlatformUser) {
            return $this->user = null;
        }

        return $this->user = $user;
    }

    public function id(): int|string|null
    {
        return $this->user()?->getAuthIdentifier();
    }

    /**
     * Validate credentials against the platform identity store. Supports the
     * token path (`['token' => ...]`) used in B1; password login is B2.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function validate(array $credentials = []): bool
    {
        if (isset($credentials['token']) && is_string($credentials['token'])) {
            $claims = TokenAudience::verify($credentials['token']);

            if ($claims === null || ! $this->audience()->matches($claims)) {
                return false;
            }

            $subject = $claims['sub'] ?? null;

            return $subject !== null
                && $this->provider->retrieveById($subject) instanceof PlatformUser;
        }

        return false;
    }

    public function hasUser(): bool
    {
        return $this->user !== null;
    }

    public function setUser(Authenticatable $user): void
    {
        $this->user = $user;
        $this->resolved = true;
    }

    /**
     * Extract the bearer token from the request (Authorization header, or an
     * explicit `token` query/body param as a test convenience).
     */
    protected function bearerToken(): ?string
    {
        $bearer = $this->request->bearerToken();

        if ($bearer !== null && $bearer !== '') {
            return $bearer;
        }

        $token = $this->request->input('token');

        return is_string($token) && $token !== '' ? $token : null;
    }
}
