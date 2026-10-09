<?php

namespace App\Platform;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Domain error for an illegal tenant lifecycle transition or a failed
 * activation guard (ADR-008).
 *
 * Maps to HTTP 409 Conflict with the contract `Error` shape
 * (openapi.yaml #/components/schemas/Error):
 *
 *   { "error": { "code": string, "message": string, "request_id"?: string } }
 *
 * The service that throws this is PURE (framework-agnostic); the HTTP mapping
 * lives here via `render()` so the service never touches the response layer.
 * `bootstrap/app.php` also registers a renderer as a belt-and-braces fallback.
 */
class TenantLifecycleException extends RuntimeException
{
    public const HTTP_STATUS = 409;

    /** Illegal source→destination transition (not in the ADR-008 map). */
    public const CODE_ILLEGAL_TRANSITION = 'tenant_lifecycle_illegal_transition';

    /** Transition requested out of the terminal `inactive` state. */
    public const CODE_TERMINAL_STATE = 'tenant_lifecycle_terminal_state';

    /** Activation requested but a guard precondition failed. */
    public const CODE_ACTIVATION_GUARD_FAILED = 'tenant_lifecycle_activation_guard_failed';

    public function __construct(
        private readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function statusCode(): int
    {
        return self::HTTP_STATUS;
    }

    /**
     * Render to the contract `Error` shape at HTTP 409.
     */
    public function render(Request $request): JsonResponse
    {
        $error = [
            'code' => $this->errorCode,
            'message' => $this->getMessage(),
        ];

        // Correlation id if the request carries one (header or Laravel's trace id).
        $requestId = $request->headers->get('X-Request-Id')
            ?? $request->attributes->get('request_id');

        if (is_string($requestId) && $requestId !== '') {
            $error['request_id'] = $requestId;
        }

        return new JsonResponse(['error' => $error], self::HTTP_STATUS);
    }

    public static function illegalTransition(string $from, string $to): self
    {
        return new self(
            self::CODE_ILLEGAL_TRANSITION,
            "Illegal tenant lifecycle transition: '{$from}' → '{$to}'.",
        );
    }

    public static function terminalState(string $from, string $to): self
    {
        return new self(
            self::CODE_TERMINAL_STATE,
            "Tenant is in terminal state '{$from}'; no transition to '{$to}' is permitted.",
        );
    }

    public static function activationGuardFailed(string $message): self
    {
        return new self(self::CODE_ACTIVATION_GUARD_FAILED, $message);
    }
}
