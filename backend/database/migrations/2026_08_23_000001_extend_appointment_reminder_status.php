<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE appointment_reminders MODIFY COLUMN status ENUM('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("UPDATE appointment_reminders SET status = 'failed' WHERE status = 'cancelled'");
        DB::statement("ALTER TABLE appointment_reminders MODIFY COLUMN status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'");
    }
};
