<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_payments', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('bill_id')->constrained('bills')->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->decimal('applied_amount', 12, 2);
            $table->string('method', 40);
            $table->string('reference', 100)->nullable()->unique();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['bill_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_payments');
    }
};
