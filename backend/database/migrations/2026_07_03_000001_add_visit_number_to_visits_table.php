<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add human-readable visit_number to the visits table.
 *
 * Each visit gets a unique visit number (e.g. VIS-2026-000042) generated
 * by the SequenceService at registration time. This is distinct from
 * patient_number, which is a permanent patient identifier.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->string('visit_number', 30)->nullable()->unique()->after('public_id');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->dropColumn('visit_number');
        });
    }
};
