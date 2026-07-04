<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pending_contact_changes')) {
            return;
        }

        Schema::create('pending_contact_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('field', ['email', 'phone']);
            $table->string('new_value');
            $table->string('verification_token');
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'field']);
            $table->index(['expires_at', 'verified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_contact_changes');
    }
};
