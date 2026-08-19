<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->foreign('appointment_id')->references('id')->on('appointments')->nullOnDelete();
        });

        Schema::table('queue_tickets', function (Blueprint $table): void {
            $table->foreign('appointment_id')->references('id')->on('appointments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('queue_tickets', function (Blueprint $table): void {
            $table->dropForeign(['appointment_id']);
        });

        Schema::table('visits', function (Blueprint $table): void {
            $table->dropForeign(['appointment_id']);
        });
    }
};
