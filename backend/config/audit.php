<?php

return [

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
    | ----------------------------------------------------------------------
    | MERGE-RECONCILIATION NOTE (B1-09)
    | ----------------------------------------------------------------------
    | A sibling task B1-09 introduces this SAME file with a top-level
    | `platform` block (platform_audit_logs). B1-11 is NOT based on B1-09, so
    | this copy contains ONLY the `tenant` block. At sprint integration the two
    | copies MUST be reconciled into a single config/audit.php holding BOTH the
    | `platform` and `tenant` blocks. The two blocks are independent (different
    | keys, different fixed collection names), so the merge is additive — no key
    | conflict is expected; just keep both blocks.
    |
    */

    'tenant' => [

        // 'mongodb' in prod/local-docker; 'fake' in tests (and until the Mongo
        // driver/package is installed). Defaults to the in-memory fake unless a
        // real Mongo is explicitly configured.
        'driver' => env('TENANT_AUDIT_DRIVER', env('APP_ENV') === 'testing' ? 'fake' : 'fake'),

        // Fixed separate collection name (ADR-007 §7). Kept in sync with
        // MongoAuditLogStore::COLLECTION.
        'collection' => 'audit_logs',

        'mongo' => [
            // Connection string + database for MongoDB Atlas (ap-south-1, via
            // PrivateLink). Credentials come from Secrets Manager via env; never
            // commit them.
            'uri' => env('MONGODB_URI'),
            'database' => env('MONGODB_DATABASE', 'hrms_tenant_audit'),
        ],
    ],

];
