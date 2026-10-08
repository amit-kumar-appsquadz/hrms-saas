<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deny-by-default placeholder guard (B1-00).
 *
 * Both plane middleware groups (`tenant`, `platform`) are intentionally EMPTY of
 * real auth in B1-00 — the real guards land in B1-03 (platform) and B1-07 (tenant).
 * Until then this middleware enforces the steering security invariant that neither
 * plane may serve a request unauthenticated: every route behind a plane group is
 * rejected with 401. The ONLY intentionally-open routes are the health checks,
 * which are registered OUTSIDE these groups.
 *
 * When B1-03/B1-07 land, they replace this placeholder in the respective group with
 * the audience/identity/context guards. Do not relax this to "allow" — a plane group
 * that fails open is a cross-plane / cross-tenant security hole.
 */
class DenyByDefault
{
    public function handle(Request $request, Closure $next): Response
    {
        return response()->json([
            'error' => [
                'code' => 'unauthenticated',
                'message' => 'This endpoint is not yet available. '
                    .'Plane authentication guards are not wired in B1-00 (deny-by-default).',
            ],
        ], Response::HTTP_UNAUTHORIZED);
    }
}
