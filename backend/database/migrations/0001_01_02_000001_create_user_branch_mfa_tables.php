<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // user_branch_access: pivot granting a user access to one or many branches
        Schema::create('user_branch_access', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->boolean('is_home')->default(false);
            $table->timestamp('granted_at')->nullable();
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'branch_id']);
            $table->index(['user_id', 'is_home']);
        });

        // TOTP MFA per user
        Schema::create('user_mfa', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('secret');                          // encrypted cast
            $table->text('recovery_codes')->nullable();      // encrypted array of hashes
            $table->timestamp('enabled_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'enabled_at']);
        });

        // Login history (foundation §11)
        Schema::create('login_history', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 1024)->nullable();
            $table->string('device_id', 128)->nullable();
            $table->string('status', 32);                    // success | failed_password | failed_mfa | locked
            $table->boolean('mfa_used')->default(false);
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lon', 9, 6)->nullable();
            $table->timestamp('attempted_at')->useCurrent();
            $table->timestamps();

            $table->index(['user_id', 'attempted_at']);
            $table->index(['status', 'attempted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_history');
        Schema::dropIfExists('user_mfa');
        Schema::dropIfExists('user_branch_access');
    }
};