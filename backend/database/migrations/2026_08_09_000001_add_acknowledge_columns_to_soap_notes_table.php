<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds nurse-acknowledgement tracking to signed SOAP notes.
 *
 * Audit requirement (post_signature_soap_actions.md): every post-signature
 * action — including a nurse acknowledging care instructions — must be logged
 * with actor, role, action, timestamp, and note_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('soap_notes', function (Blueprint $table): void {
            $table->unsignedBigInteger('acknowledged_by')->nullable()->after('is_amended');
            $table->timestamp('acknowledged_at')->nullable()->after('acknowledged_by');

            $table->foreign('acknowledged_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('soap_notes', function (Blueprint $table): void {
            $table->dropForeign(['acknowledged_by']);
            $table->dropColumn(['acknowledged_by', 'acknowledged_at']);
        });
    }
};
