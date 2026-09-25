<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bills', function (Blueprint $table): void {
            $table->string('mpesa_merchant_request_id', 64)->nullable()->index();
            $table->string('mpesa_checkout_request_id', 64)->nullable()->unique();
            $table->string('mpesa_receipt', 32)->nullable()->unique();
            $table->string('mpesa_phone', 20)->nullable();
            $table->decimal('mpesa_amount', 12, 2)->nullable();
            $table->string('mpesa_status', 20)->nullable()->index();
            $table->unsignedInteger('mpesa_result_code')->nullable();
            $table->string('mpesa_result_description', 255)->nullable();
            $table->timestamp('mpesa_transaction_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table): void {
            $table->dropUnique(['mpesa_checkout_request_id']);
            $table->dropUnique(['mpesa_receipt']);
            $table->dropIndex(['mpesa_merchant_request_id']);
            $table->dropIndex(['mpesa_status']);
            $table->dropColumn([
                'mpesa_merchant_request_id', 'mpesa_checkout_request_id', 'mpesa_receipt',
                'mpesa_phone', 'mpesa_amount', 'mpesa_status', 'mpesa_result_code',
                'mpesa_result_description', 'mpesa_transaction_at',
            ]);
        });
    }
};
