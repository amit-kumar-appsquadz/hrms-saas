<?php

namespace App\Http\Middleware\Platform;

use App\Auth\PlatformGuard;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsurePlatformAudience — platform-plane authentication gate (ADR-007 §1, §3).
 *
 * Replaces the B1-00 DenyByDefault placeholder on the `platform` middleware group.
 * It authenticates the request through the {@see PlatformGuard}, which:
 *   - rejects any token whose `aud` is not `platform` (a tenant-audience token is
 *     refused here even on a platform route — the boundary is server-side, not the
 *     path/host), and
 *   - resolves the subject ONLY against the `platform_users` identity store.
 *
 * On failure it returns 401 with the contract-style error envelope. On success the
 * resolved platform user is bound to the `platform` guard for downstream
 * authorization ({@see AuthorizePlatform}).
 *
 * FAIL CLOSED: anything not provably a valid platform token is rejected.
 */
class EnsurePlatformAudience
{
    public function handle(Request $request, Closure $next): Response
    {
        $guard = Auth::guard('platform');

        if (! $guard->check()) {
            return response()->json([
                'error' => [
                    'code' => 'unauthenticated',
                    'message' => 'A valid platform-audience token is required for the platform plane.',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
