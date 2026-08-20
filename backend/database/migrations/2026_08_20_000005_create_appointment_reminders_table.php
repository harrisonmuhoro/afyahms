<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * appointment_reminders — audit trail for all reminder dispatches per appointment.
 * Tracks channel, scheduled time, outcome, and any error messages (spec §4.5).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_reminders', function (Blueprint $table): void {
            $table->char('id', 36)->primary();
            $table->unsignedBigInteger('appointment_id')->index();
            $table->enum('channel', ['sms', 'email', 'whatsapp']);
            $table->string('type', 30);                                  // confirmation|24h|2h|cancellation|reschedule
            $table->timestamp('scheduled_at');
            $table->timestamp('sent_at')->nullable();
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('appointment_id')
                  ->references('id')
                  ->on('appointments')
                  ->cascadeOnDelete();

            $table->index(['status', 'scheduled_at'], 'idx_status_scheduled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_reminders');
    }
};
