<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Triage assessments table per docs/11-database-schema.md.
 *
 * Captures vitals + MTS category. Drives queue priority + target-time SLA.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('triage_assessments', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('visit_id');
            $table->unsignedBigInteger('queue_ticket_id')->nullable();
            $table->unsignedBigInteger('encounter_id')->nullable();
            $table->enum('mts_level', ['red', 'orange', 'yellow', 'green', 'blue']);
            $table->string('chief_complaint', 500)->nullable();
            $table->decimal('temperature_c', 4, 1)->nullable();
            $table->unsignedSmallInteger('pulse_bpm')->nullable();
            $table->unsignedSmallInteger('respiratory_rate')->nullable();
            $table->unsignedSmallInteger('systolic_bp')->nullable();
            $table->unsignedSmallInteger('diastolic_bp')->nullable();
            $table->unsignedSmallInteger('spo2_pct')->nullable();
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->decimal('height_cm', 5, 2)->nullable();
            $table->decimal('bmi', 5, 2)->nullable();
            $table->unsignedTinyInteger('pain_score')->nullable();   // 0–10
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('assessed_by');
            $table->timestamp('assessed_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('visit_id')->references('id')->on('visits')->cascadeOnDelete();
            $table->foreign('queue_ticket_id')->references('id')->on('queue_tickets')->nullOnDelete();
            $table->foreign('assessed_by')->references('id')->on('users')->restrictOnDelete();

            $table->index(['branch_id', 'assessed_at']);
            $table->index(['visit_id']);
            $table->index(['patient_id', 'assessed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('triage_assessments');
    }
};
