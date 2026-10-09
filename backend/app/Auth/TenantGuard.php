<?php

namespace App\Auth;

use App\Models\Tenant\TenantUser;
use App\Tenancy\TenantContext;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;

/**
 * TenantGuard — authentication guard for the TENANT plane (ADR-007 §1, §3).
 *
 * This is the tenant-plane counterpart of {@see PlatformGuard}. It enforces the
 * server-side plane + tenant boundary, in order (ADR-007 §1):
 *
 *   (1) TOKEN AUDIENCE — rejects any bearer token whose `aud` claim is not
 *       `tenant`. A `platform`-audience token is rejected here regardless of the
 *       route/path/host it arrives on (the boundary is server-side, not the URL,
 *       ADR-007 §1 final para). This is the "reject platform tokens" acceptance.
 *
 *   (2) TENANT CONTEXT (fail-closed) — authentication only happens WITHIN a
 *       resolved tenant. If no tenant is bound in {@see TenantContext}
 *       (base/reserved host, or ResolveTenant did not run), the guard rejects —
 *       it NEVER authenticates against "all tenants".
 *
 *   (3) IDENTITY STORE, TENANT-SCOPED — the subject (`sub`) is resolved ONLY
 *       against the tenant-owned `users` identity store, CONSTRAINED to the
 *       resolved `tenant_id`. A tenant-B user id presented in tenant A's context
 *       does not resolve, so cross-tenant authentication is rejected. There is
 *       no shared/universal user table with `platform_users` (ADR-007 §1, §8).
 *
 *   (4) DOUBLE CHECK — after resolving, the guard re-verifies the loaded row's
 *       `tenant_id` equals the context's tenant id. This holds even if B1-06's
 *       `BelongsToTenant` global scope is not yet applied to the model (it is a
 *       parallel wave-2 task not present in this base branch — see
 *       docs/notes/B1-07.md). The double check is belt-and-braces: the query is
 *       already tenant-scoped AND the result is re-validated.
 *
 * The guard is stateless (bearer-token based), appropriate for an API plane and
 * for the B1 test-only token primitive. Full login/password/MFA is B2.
 *
 * Returns null (not an exception) on any failure so middleware decides the HTTP
 * response. FAIL CLOSED: anything not provably a valid tenant token for the
 * resolved tenant is rejected.
 */
class TenantGuard implements Guard
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
        protected TenantContext $tenant,
    ) {}

    /**
     * The plane this guard serves. The audience check compares the token's `aud`
     * claim against this value — anything else (notably `platform`) is rejected.
     */
    public function audience(): TokenAudience
    {
        return TokenAudience::TENANT;
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
     * Resolve the authenticated tenant user from the bearer token, enforcing the
     * audience + tenant-context + tenant-scoped identity checks described above.
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

        // (1) AUDIENCE: reject anything that is not a tenant-audience token.
        //     A `platform`-audience token is refused here, independent of path.
        if (! $this->audience()->matches($claims)) {
            return $this->user = null;
        }

        // (2) TENANT CONTEXT: must be resolved. Fail closed when absent — never
        //     authenticate across "all tenants".
        if (! $this->tenant->hasTenant()) {
            return $this->user = null;
        }
        $tenantId = $this->tenant->tenantId();

        $subject = $claims['sub'] ?? null;
        if ($subject === null) {
            return $this->user = null;
        }

        // The token MAY also carry a `tid` (tenant id) claim. When present it
        // MUST match the resolved context — a tenant-A token replayed against
        // tenant B's context is rejected on this claim alone, before any DB
        // lookup. (Tokens minted without `tid` still pass here and are caught by
        // the tenant-scoped lookup + double check below.)
        if (array_key_exists('tid', $claims)
            && (string) $claims['tid'] !== (string) $tenantId) {
            return $this->user = null;
        }

        // (3) IDENTITY STORE, TENANT-SCOPED: resolve the subject ONLY within the
        //     resolved tenant. A user id from another tenant does not resolve
        //     here, so cross-tenant authentication is impossible. We query the
        //     tenant-owned model directly, filtered by tenant_id, so isolation
        //     does not depend on B1-06's global scope being present yet.
        $user = TenantUser::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($subject)
            ->first();

        if (! $user instanceof TenantUser) {
            return $this->user = null;
        }

        // (4) DOUBLE CHECK: re-validate the loaded row belongs to the resolved
        //     tenant. Redundant with the WHERE above by design (defence in depth
        //     against a future scope-bypass or a trait misconfiguration).
        if ((string) $user->getAttribute('tenant_id') !== (string) $tenantId) {
            return $this->user = null;
        }

        // Stub status gate: only active tenant users may authenticate. Full
        // status/lifecycle semantics are B2.
        if (! $user->isActive()) {
            return $this->user = null;
        }

        return $this->user = $user;
    }

    public function id(): int|string|null
    {
        return $this->user()?->getAuthIdentifier();
    }

    /**
     * Validate credentials against the tenant identity store. Supports the token
     * path (`['token' => ...]`) used in B1; password login is B2.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function validate(array $credentials = []): bool
    {
        if (isset($credentials['token']) && is_string($credentials['token'])) {
            // Reuse the full resolution path so audience + context + tenant
            // scoping all apply identically.
            $original = $this->request->headers->get('Authorization');
            $this->request->headers->set('Authorization', 'Bearer '.$credentials['token']);
            $this->resolved = false;
            $this->user = null;

            $ok = $this->user() !== null;

            // Restore request state.
            if ($original === null) {
                $this->request->headers->remove('Authorization');
            } else {
                $this->request->headers->set('Authorization', $original);
            }
            $this->resolved = false;
            $this->user = null;

            return $ok;
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
