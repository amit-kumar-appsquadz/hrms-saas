<?php

/*
|--------------------------------------------------------------------------
| Tenancy configuration (B1-05)
|--------------------------------------------------------------------------
|
| Host-based tenant resolution config (ADR-001 "Tenancy model" + the
| "Platform plane and reserved hosts" amendment, reconciled with ADR-007).
|
| The security boundary is NOT the host — it is identity + token audience +
| permission namespace + resolved tenant context (ADR-007 §1). The host is a
| ROUTING convenience only. This config exists so the resolver can:
|   1. know which base domain tenant subdomains hang off of; and
|   2. know which labels are RESERVED and therefore never a tenant.
|
| Fail-closed is the core isolation guarantee: a tenant-scoped request with no
| resolvable tenant must NEVER default to a tenant (handled in ResolveTenant).
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Base domain
    |--------------------------------------------------------------------------
    |
    | The apex/base host that the platform plane lives on
    | (app.example.com/platform/*) and off which tenant subdomains hang
    | (<tenant>.app.example.com). A request whose host IS exactly the base
    | domain resolves to NO tenant (it is the platform/base host, ADR-001
    | amendment). Configurable per environment; defaults match the OpenAPI
    | `servers` block.
    |
    | No `admin` host exists anywhere (ADR-007 decision 2).
    |
    */

    'base_domain' => env('TENANCY_BASE_DOMAIN', 'app.example.com'),

    /*
    |--------------------------------------------------------------------------
    | Reserved labels (never a tenant subdomain)
    |--------------------------------------------------------------------------
    |
    | The single-label hosts that are NOT tenant subdomains. If the leftmost
    | label of `<label>.<base_domain>` is in this list, the resolver treats the
    | request as "no tenant" rather than trying to resolve a tenant named
    | `app`/`www`/etc. Onboarding (ADR-008) also refuses to allocate any of
    | these as a tenant subdomain.
    |
    | NOTE: `admin` is reserved to GUARANTEE no tenant can ever claim it, even
    | though there is deliberately NO admin host (ADR-007). Reserving it is a
    | defence-in-depth measure, not an admin-host declaration.
    |
    */

    'reserved_labels' => [
        'app',
        'www',
        'platform',
        'admin',
        'api',
        'static',
    ],

    /*
    |--------------------------------------------------------------------------
    | Tenant statuses that are allowed to be served (ADR-008)
    |--------------------------------------------------------------------------
    |
    | A tenant whose status is NOT in this list is refused access/login with a
    | clear, NON-ENUMERATING message. The authoritative status set and its
    | login-allowed semantics live in ADR-008:
    |   provisioning -> no   (setup in progress)
    |   trial        -> yes
    |   active       -> yes
    |   suspended    -> no   (reversible disable)
    |   inactive     -> no   (terminal / offboarded)
    |
    | This mirror is read by the resolver; the lifecycle state machine (B1-04)
    | owns transitions. Keep in sync with ADR-008 — do not add a status here
    | that ADR-008 does not define (no `pending`).
    |
    */

    'serveable_statuses' => [
        'trial',
        'active',
    ],

];
