<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('verification_tokens', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->string('channel')->default('email');
        $table->string('token', 64);
        $table->string('new_value');
        $table->string('type');
        $table->unsignedTinyInteger('attempts')->default(0);
        $table->unsignedTinyInteger('sends')->default(1);
        $table->timestamp('expires_at');
        $table->timestamp('used_at')->nullable();
        $table->timestamps();

        $table->index(['user_id', 'channel', 'type']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('verification_tokens');
    }
};
