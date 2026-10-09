<?php

namespace App\Http\Middleware\Platform;

use App\Models\Platform\PlatformUser;
use App\Platform\PlatformAuthorizer;
use App\Platform\PlatformRole;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * AuthorizePlatform — per-endpoint `platform.*` permission check (ADR-007 §3, §4).
 *
 * Used as `platform.authorize:platform.tenant.view` after {@see EnsurePlatformAudience}
 * has authenticated the platform user. It maps the authenticated user's fixed
 * {@see PlatformRole} to its `platform.*` permissions via {@see PlatformAuthorizer}
 * (the code-mapped Phase-1 authorizer / extension seam) and authorizes the specific
 * permission required by the route.
 *
 * It only ever evaluates `platform.*` permissions — the authorizer carries no
 * `tenant.*`. A non-platform permission string can never be granted here.
 *
 * FAIL CLOSED: no permission granted ⇒ 403.
 */
class AuthorizePlatform
{
    public function __construct(private PlatformAuthorizer $authorizer) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = Auth::guard('platform')->user();

        if (! $user instanceof PlatformUser) {
            // Defensive: this middleware must run AFTER EnsurePlatformAudience.
            return response()->json([
                'error' => [
                    'code' => 'unauthenticated',
                    'message' => 'Platform authentication is required.',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        $role = $user->platform_role instanceof PlatformRole
            ? $user->platform_role
            : PlatformRole::from((string) $user->platform_role);

        if (! $this->authorizer->roleCan($role, $permission)) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message' => 'The platform role does not grant the required permission.',
                    'required_permission' => $permission,
                ],
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
