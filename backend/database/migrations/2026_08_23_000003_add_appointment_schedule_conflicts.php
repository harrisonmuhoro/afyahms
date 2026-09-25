<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->boolean('schedule_conflict')->default(false)->after('encounter_id');
            $table->string('schedule_conflict_reason', 500)->nullable()->after('schedule_conflict');
            $table->timestamp('schedule_conflict_at')->nullable()->after('schedule_conflict_reason');
            $table->index(['branch_id', 'schedule_conflict']);
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropIndex('appointments_branch_id_schedule_conflict_index');
            $table->dropColumn(['schedule_conflict', 'schedule_conflict_reason', 'schedule_conflict_at']);
        });
    }
};
