<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Billing module — bills table.
 *
 * A bill is created automatically when a visit opens and tracks
 * what the patient owes. The bill must be fully cleared (status = 'cleared')
 * before the Billing station can complete/discharge the patient.
 *
 * Foundation §billing: no hard-delete; use soft-deletes for audit trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('visit_id')->unique();   // one bill per visit
            $table->unsignedBigInteger('patient_id');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('status', ['pending', 'partial', 'cleared', 'waived'])->default('pending');
            $table->string('payment_method', 40)->nullable();   // cash|mpesa|insurance|waived
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('cleared_by')->nullable();
            $table->timestamp('cleared_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('visit_id')->references('id')->on('visits')->restrictOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('cleared_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['branch_id', 'status']);
            $table->index(['patient_id', 'status']);
        });

        // Bill line-items (services, medications, procedures)
        Schema::create('bill_items', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('bill_id');
            $table->string('description', 255);
            $table->string('category', 60)->default('service'); // service|medication|lab|radiology|consultation
            $table->decimal('unit_price', 10, 2);
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('total_price', 10, 2);
            $table->timestamps();

            $table->foreign('bill_id')->references('id')->on('bills')->cascadeOnDelete();
            $table->index('bill_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_items');
        Schema::dropIfExists('bills');
    }
};
