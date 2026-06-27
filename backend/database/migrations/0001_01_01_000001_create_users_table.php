<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->string('name', 255);
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('phone', 32)->nullable()->index();
            $table->string('password');
            $table->timestamp('password_changed_at')->nullable();

            // Branch links (one user may belong to many; home + current per-session)
            $table->unsignedBigInteger('home_branch_id')->nullable();
            $table->unsignedBigInteger('current_branch_id')->nullable();

            // MFA
            $table->boolean('mfa_enabled')->default(false);
            $table->timestamp('mfa_confirmed_at')->nullable();

            // Activity / lockout
            $table->timestamp('last_seen_at')->nullable();
            $table->unsignedSmallInteger('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();

            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('home_branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('current_branch_id')->references('id')->on('branches')->nullOnDelete();
        });

        // Password reset tokens (Sanctum)
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Sessions (we use redis; this table is optional stateful fallback)
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};