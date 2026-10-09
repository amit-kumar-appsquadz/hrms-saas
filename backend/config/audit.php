<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Platform audit store (B1-09, ADR-007 §7 / ADR-003)
    |--------------------------------------------------------------------------
    |
    | Platform audit events are written to a SEPARATE MongoDB collection,
    | `platform_audit_logs`, never mixed with the tenant `audit_logs` collection
    | (B1-11). The collection name is fixed by code
    | (App\Platform\Audit\MongoPlatformAuditLogStore::COLLECTION) and mirrored
    | here for the production wiring.
    |
    | REAL MONGO WIRING (production / local docker Mongo):
    |   - 'driver' = 'mongodb' selects the real append-only Mongo store.
    |   - The Mongo URI + database come from env (MONGODB_URI / MONGODB_DATABASE).
    |     In production these resolve from AWS Secrets Manager via PrivateLink
    |     (ADR-003); they are NEVER committed.
    |   - A human runs the index-ensure + applies Atlas infra (steering rule 6).
    |
    | TESTS:
    |   - 'driver' = 'fake' (the default under APP_ENV=testing) binds an
    |     in-memory PlatformAuditCollection, so tests make NO cloud/Mongo calls
    |     (steering). See App\Providers\AppServiceProvider.
    |
    */

    'platform' => [

        'driver' => env(
            'PLATFORM_AUDIT_DRIVER',
            env('APP_ENV') === 'testing' ? 'fake' : 'fake'
        ),

        'collection' => 'platform_audit_logs',

        'mongo' => [
            'uri' => env('MONGODB_URI'),
            'database' => env('MONGODB_DATABASE', 'hrms_platform_audit'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Tenant audit store (B1-11, ADR-007 §7 / ADR-003)
    |--------------------------------------------------------------------------
    |
    | Tenant audit events are written to a SEPARATE MongoDB collection,
    | `audit_logs`, never mixed with the platform `platform_audit_logs`
    | collection (B1-09). The collection name is fixed by code
    | (App\Tenancy\Audit\MongoAuditLogStore::COLLECTION) and mirrored here for
    | the production wiring.
    |
    | REAL MONGO WIRING (production / local docker Mongo):
    |   - 'driver' = 'mongodb' selects the real append-only Mongo store.
    |   - The Mongo URI + database come from env (MONGODB_URI / MONGODB_DATABASE).
    |     In production these resolve from AWS Secrets Manager via PrivateLink
    |     (ADR-003); they are NEVER committed.
    |   - A human runs the index-ensure + applies Atlas infra (steering rule 6).
    |
    | TESTS:
    |   - 'driver' = 'fake' (the default under APP_ENV=testing) binds an
    |     in-memory AuditCollection, so tests make NO cloud/Mongo calls
    |     (steering). See App\Providers\TenancyServiceProvider.
    |
    */

    'tenant' => [

        'driver' => env(
            'TENANT_AUDIT_DRIVER',
            env('APP_ENV') === 'testing' ? 'fake' : 'fake'
        ),

        'collection' => 'audit_logs',

        'mongo' => [
            'uri' => env('MONGODB_URI'),
            'database' => env('MONGODB_DATABASE', 'hrms_tenant_audit'),
        ],
    ],

];