<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * doctor_schedules — defines when a doctor is available for appointments
 * at a given branch (spec §4.1).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_schedules', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('doctor_id')->index();
            $table->string('name', 100);                          // e.g. "Morning Clinic"
            $table->unsignedTinyInteger('slot_duration')->default(20);  // minutes
            $table->unsignedTinyInteger('max_concurrent')->default(1);  // overbooking limit
            $table->date('valid_from');
            $table->date('valid_until')->nullable();              // NULL = no end date
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
            $table->foreign('doctor_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index(['branch_id', 'doctor_id'], 'idx_branch_doctor');
            $table->index(['is_active', 'valid_from', 'valid_until'], 'idx_active_valid');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_schedules');
    }
};
