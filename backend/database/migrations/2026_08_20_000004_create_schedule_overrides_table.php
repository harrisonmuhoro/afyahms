<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * schedule_overrides — handles one-off exceptions to the regular schedule:
 *   - 'unavailable': doctor on leave (full day or specific hours)
 *   - 'extra':       extra availability outside normal hours
 * (spec §4.3)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_overrides', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('schedule_id', 36)->index();
            $table->date('override_date');
            $table->enum('type', ['unavailable', 'extra']);
            $table->time('start_time')->nullable();   // NULL = affects full day
            $table->time('end_time')->nullable();
            $table->string('reason', 255)->nullable();
            $table->unsignedBigInteger('created_by')->index();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('schedule_id')
                  ->references('id')
                  ->on('doctor_schedules')
                  ->cascadeOnDelete();

            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->restrictOnDelete();

            // One override record per schedule per date
            $table->unique(['schedule_id', 'override_date'], 'uq_schedule_date');
            $table->index('override_date', 'idx_override_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_overrides');
    }
};
