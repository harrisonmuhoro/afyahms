<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropUnique('appointments_appointment_number_unique');
            $table->unique(['branch_id', 'appointment_number']);
        });

        $rows = DB::table('appointments')
            ->select(
                'branch_id',
                DB::raw('YEAR(created_at) as year_number'),
                DB::raw("MAX(CAST(SUBSTRING_INDEX(appointment_number, '-', -1) AS UNSIGNED)) as current_value"),
            )
            ->whereNotNull('appointment_number')
            ->groupBy('branch_id', DB::raw('YEAR(created_at)'))
            ->get();

        foreach ($rows as $row) {
            DB::table('sequences')->insertOrIgnore([
                'scope' => "appointment:{$row->branch_id}:{$row->year_number}",
                'value' => (int) $row->current_value,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropUnique('appointments_branch_id_appointment_number_unique');
            $table->unique('appointment_number');
        });
    }
};
