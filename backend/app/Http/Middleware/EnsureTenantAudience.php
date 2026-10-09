<?php

namespace App\Http\Middleware;

use App\Auth\TenantGuard;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureTenantAudience — tenant-plane authentication gate (ADR-007 §1, §3).
 *
 * The tenant-plane counterpart of EnsurePlatformAudience (B1-03). Replaces the
 * B1-00 DenyByDefault placeholder on the `tenant` middleware group. It
 * authenticates the request through the {@see TenantGuard}, which:
 *   - rejects any token whose `aud` is not `tenant` (a platform-audience token
 *     is refused here even on a tenant route — the boundary is server-side, not
 *     the path/host),
 *   - requires a resolved tenant context (fail-closed; must run AFTER
 *     `resolve.tenant`), and
 *   - resolves the subject ONLY against the tenant-owned `users` store scoped to
 *     the resolved tenant, so a user from another tenant cannot authenticate.
 *
 * On failure it returns 401 with the contract-style error envelope. On success
 * the resolved tenant user is bound to the `tenant` guard for downstream
 * authorization (tenant RBAC lands in B3).
 *
 * MIDDLEWARE ORDER: this gate assumes tenant resolution has already run so the
 * TenantContext is populated. On the `tenant` route group that means
 * `resolve.tenant:required` precedes `tenant.auth`. If the context is empty the
 * guard fails closed and this returns 401 — never a default tenant.
 *
 * FAIL CLOSED: anything not provably a valid tenant token for the resolved
 * tenant is rejected.
 */
class EnsureTenantAudience
{
    public function handle(Request $request, Closure $next): Response
    {
        $guard = Auth::guard('tenant');

        if (! $guard->check()) {
            return response()->json([
                'error' => [
                    'code' => 'unauthenticated',
                    'message' => 'A valid tenant-audience token for this workspace is required.',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
