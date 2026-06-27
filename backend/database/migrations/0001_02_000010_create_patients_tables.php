<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase-1 clinical MVP — Patients module tables.
 *
 * Five tables land in this single migration to keep the Phase-1 release
 * atomic and avoid half-applied state on rollback:
 *   - patients                       (root aggregate, exposes public_id UUID)
 *   - patient_next_of_kin
 *   - patient_relationships
 *   - patient_insurance
 *   - allergies
 *
 * Source of truth: docs/11-database-schema.md (final, post-audit) and
 * docs/00-foundation.md §3 (identifiers), §4 (tenancy), §11 (PHI / retention).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->char('public_id', 36);
            $table->string('patient_number', 20);
            $table->unsignedBigInteger('branch_id');
            $table->string('first_name', 80);
            $table->string('middle_name', 80)->nullable();
            $table->string('last_name', 80);
            $table->string('national_id', 255)->nullable();
            $table->string('sha_number', 255)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other', 'unknown'])->default('unknown');
            $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed', 'unknown'])->default('unknown');
            $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])->default('unknown');
            $table->string('phone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('county', 80)->nullable();
            $table->string('sub_county', 80)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('occupation', 120)->nullable();
            $table->string('photo_path', 512)->nullable();
            $table->boolean('deceased')->default(false);
            $table->date('deceased_at')->nullable();
            $table->unsignedBigInteger('portal_user_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('registered_by')->nullable();
            $table->char('merged_into_public_id', 36)->nullable();
            $table->timestamp('merged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('public_id', 'uq_patients_public_id');
            $table->unique('patient_number', 'uq_patients_number');
            $table->index('branch_id', 'idx_patients_branch');
            $table->index(['last_name', 'first_name'], 'idx_patients_name');
            $table->index('phone', 'idx_patients_phone');
            $table->index('national_id', 'idx_patients_national_id');
            $table->index('sha_number', 'idx_patients_sha');
            $table->index(['branch_id', 'is_active'], 'idx_patients_branch_active');
            $table->index('portal_user_id', 'idx_patients_portal_user');

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreign('portal_user_id')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('registered_by')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('patient_next_of_kin', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('branch_id');
            $table->string('full_name', 160);
            $table->string('relationship', 60);
            $table->string('phone', 30)->nullable();
            $table->string('alt_phone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('address', 255)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_emergency')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('patient_id', 'idx_nok_patient');
            $table->index('branch_id', 'idx_nok_branch');

            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete()->cascadeOnUpdate();
        });

        Schema::create('patient_relationships', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('related_patient_id');
            $table->string('relationship_type', 60);
            $table->boolean('is_guardian')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['patient_id', 'related_patient_id', 'relationship_type'], 'uq_patient_rel');
            $table->index('related_patient_id', 'idx_patient_rel_related');

            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('related_patient_id')->references('id')->on('patients')->cascadeOnDelete()->cascadeOnUpdate();
        });

        Schema::create('patient_insurance', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('branch_id');
            $table->enum('scheme_type', ['sha', 'private', 'corporate', 'cash'])->default('sha');
            $table->string('insurer_name', 150)->nullable();
            $table->string('member_number', 80)->nullable();
            $table->string('policy_number', 80)->nullable();
            $table->string('principal_name', 160)->nullable();
            $table->string('relationship', 60)->nullable();
            $table->decimal('coverage_limit', 12, 2)->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->boolean('is_primary')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('patient_id', 'idx_pins_patient');
            $table->index('branch_id', 'idx_pins_branch');
            $table->index('member_number', 'idx_pins_member');
            $table->index(['patient_id', 'is_active'], 'idx_pins_patient_active');

            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete()->cascadeOnUpdate();
        });

        Schema::create('allergies', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('branch_id');
            $table->string('allergen', 160);
            $table->enum('allergen_type', ['drug', 'food', 'environmental', 'other'])->default('drug');
            $table->string('reaction', 255)->nullable();
            $table->enum('severity', ['mild', 'moderate', 'severe', 'life_threatening'])->default('moderate');
            $table->date('onset_date')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'is_active'], 'idx_allergies_patient');
            $table->index('branch_id', 'idx_allergies_branch');

            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreign('recorded_by')->references('id')->on('users')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allergies');
        Schema::dropIfExists('patient_insurance');
        Schema::dropIfExists('patient_relationships');
        Schema::dropIfExists('patient_next_of_kin');
        Schema::dropIfExists('patients');
    }
};