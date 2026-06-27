<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * EMR module tables per docs/11-database-schema.md §6 and docs/06-user-stories US-EMR-*.
 *
 * Tables:
 *  - encounters:        clinical visit aggregate (SOAP notes + diagnoses hang off this)
 *  - soap_notes:        Subjective/Objective/Assessment/Plan note, signable + amendable
 *  - diagnoses_catalog: global ICD-10 master (no branch_id — reference data)
 *  - diagnoses:         per-encounter coded diagnoses (denormalized ICD-10 snapshot)
 *
 * Also applies the deferred FKs from visits/queue_tickets to encounters
 * (foundation: forward references resolved once both tables exist).
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────────────────────────────────
        // encounters
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('encounters', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('visit_id')->nullable();
            $table->unsignedBigInteger('appointment_id')->nullable();
            $table->unsignedBigInteger('provider_id')->nullable();
            $table->enum('encounter_type', ['outpatient', 'inpatient', 'emergency', 'teleconsult', 'procedure'])
                ->default('outpatient');
            $table->string('department', 80)->nullable();
            $table->dateTime('visit_date');
            $table->enum('status', ['open', 'in_progress', 'completed', 'cancelled'])->default('open');
            $table->enum('disposition', ['discharged', 'admitted', 'referred', 'deceased', 'followup', 'none'])
                ->default('none');
            $table->string('chief_complaint', 255)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('visit_id')->references('id')->on('visits')->nullOnDelete();
            $table->foreign('provider_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            // appointment_id FK deferred until appointments table exists.

            $table->index(['branch_id', 'visit_date']);
            $table->index(['patient_id', 'visit_date']);
            $table->index(['provider_id']);
            $table->index(['branch_id', 'status']);
        });

        // ─────────────────────────────────────────────────────────────────────
        // soap_notes
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('soap_notes', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('encounter_id');
            $table->unsignedBigInteger('patient_id');
            $table->text('subjective')->nullable();
            $table->text('objective')->nullable();
            $table->text('assessment')->nullable();
            $table->text('plan')->nullable();
            $table->unsignedBigInteger('authored_by')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->boolean('is_amended')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('encounter_id')->references('id')->on('encounters')->cascadeOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('authored_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['encounter_id']);
            $table->index(['patient_id']);
            $table->index(['branch_id']);
        });

        // ─────────────────────────────────────────────────────────────────────
        // diagnoses_catalog — global ICD-10 master (no branch_id; reference data)
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('diagnoses_catalog', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('code', 10)->unique();           // ICD-10, e.g. 'E11.9'
            $table->string('description', 255);
            $table->string('category', 120)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('description');
        });

        // ─────────────────────────────────────────────────────────────────────
        // diagnoses — per-encounter coded diagnoses
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('diagnoses', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('encounter_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('diagnosis_catalog_id')->nullable();
            $table->string('icd10_code', 10);               // denormalized snapshot
            $table->string('description', 255)->nullable(); // denormalized snapshot
            $table->enum('diagnosis_type', ['primary', 'secondary', 'provisional', 'differential'])
                ->default('primary');
            $table->enum('certainty', ['confirmed', 'suspected', 'ruled_out'])->default('confirmed');
            $table->date('onset_date')->nullable();
            $table->unsignedBigInteger('diagnosed_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('encounter_id')->references('id')->on('encounters')->cascadeOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('diagnosis_catalog_id')->references('id')->on('diagnoses_catalog')->nullOnDelete();
            $table->foreign('diagnosed_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['encounter_id']);
            $table->index(['patient_id']);
            $table->index(['branch_id']);
            $table->index(['icd10_code']);
            $table->index(['diagnosis_catalog_id']);
        });

        // ─────────────────────────────────────────────────────────────────────
        // Deferred FKs now that encounters exists.
        // ─────────────────────────────────────────────────────────────────────
        if (Schema::hasColumn('visits', 'encounter_id')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->foreign('encounter_id')->references('id')->on('encounters')->nullOnDelete();
            });
        }
        if (Schema::hasColumn('queue_tickets', 'encounter_id')) {
            Schema::table('queue_tickets', function (Blueprint $table): void {
                $table->foreign('encounter_id')->references('id')->on('encounters')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('queue_tickets', 'encounter_id')) {
            Schema::table('queue_tickets', function (Blueprint $table): void {
                $table->dropForeign(['encounter_id']);
            });
        }
        if (Schema::hasColumn('visits', 'encounter_id')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->dropForeign(['encounter_id']);
            });
        }

        Schema::dropIfExists('diagnoses');
        Schema::dropIfExists('diagnoses_catalog');
        Schema::dropIfExists('soap_notes');
        Schema::dropIfExists('encounters');
    }
};
