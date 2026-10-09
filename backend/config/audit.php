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

        // 'mongodb' in prod/local-docker; 'fake' in tests (and until the Mongo
        // driver/package is installed). Defaults to the in-memory fake unless a
        // real Mongo is explicitly configured.
        'driver' => env('PLATFORM_AUDIT_DRIVER', env('APP_ENV') === 'testing' ? 'fake' : 'fake'),

        // Fixed separate collection name (ADR-007 §7). Kept in sync with
        // MongoPlatformAuditLogStore::COLLECTION.
        'collection' => 'platform_audit_logs',

        'mongo' => [
            // Connection string + database for MongoDB Atlas (ap-south-1, via
            // PrivateLink). Credentials come from Secrets Manager via env; never
            // commit them.
            'uri' => env('MONGODB_URI'),
            'database' => env('MONGODB_DATABASE', 'hrms_platform_audit'),
        ],
    ],

];
