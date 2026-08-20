<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * schedule_time_blocks — defines the specific working hours within each day
 * of the week for a given doctor schedule (spec §4.2).
 *
 * Example: A schedule may have two blocks on Monday:
 *   08:00–13:00 and 14:00–17:00 (lunch break excluded).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_time_blocks', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->char('schedule_id', 36)->index();
            $table->unsignedTinyInteger('day_of_week');  // 0=Sunday … 6=Saturday
            $table->time('start_time');
            $table->time('end_time');

            $table->foreign('schedule_id')
                  ->references('id')
                  ->on('doctor_schedules')
                  ->cascadeOnDelete();

            $table->index(['schedule_id', 'day_of_week'], 'idx_schedule_day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_time_blocks');
    }
};
