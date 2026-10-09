<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * B1-01 — tenants table + lifecycle status column (ADR-008).
 *
 * PLATFORM-OWNED table: there is intentionally NO `tenant_id` column and the
 * Tenant model does NOT use the BelongsToTenant global scope. The `tenants`
 * registry lives on the platform plane (ADR-007) and is the authority for the
 * tenant lifecycle state machine (ADR-008).
 *
 * Status enum matches ADR-008 EXACTLY: provisioning|trial|active|suspended|inactive.
 * `pending` is explicitly rejected (synonym of `provisioning`).
 */
return new class extends Migration
{
    /**
     * The authoritative ADR-008 lifecycle status values.
     *
     * @var list<string>
     */
    private const STATUSES = ['provisioning', 'trial', 'active', 'suspended', 'inactive'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();

            // Subdomain: required, unique, immutable after creation (ADR-008).
            // Immutability is enforced at the model layer (Tenant model).
            $table->string('subdomain', 63)->unique();

            $table->string('name');

            // Lifecycle status (ADR-008). Enum constrained at the DB level on
            // MySQL; on sqlite the enum degrades to a string column (no native
            // ENUM), so the model + lifecycle service remain the source of truth.
            $table->enum('status', self::STATUSES)->default('provisioning')->index();

            $table->string('plan')->nullable();
            $table->string('region')->nullable();

            $table->string('primary_contact')->nullable();
            $table->string('contact_email')->nullable();

            // Trial / suspension / offboarding lifecycle timestamps (ADR-008).
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspended_reason')->nullable();
            $table->timestamp('offboarded_at')->nullable();

            // ADR-001 dedicated-DB seam: null = shared connection. A future
            // dedicated-DB tenant stores its connection name here.
            $table->string('db_connection')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
