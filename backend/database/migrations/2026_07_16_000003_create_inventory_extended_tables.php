<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Suppliers master list (branch-scoped)
        Schema::create('suppliers', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->string('name');
            $table->string('code', 30)->nullable()->unique();
            $table->string('category', 60)->nullable(); // pharma|lab|consumables|equipment|other
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('address')->nullable();
            $table->decimal('rating', 3, 1)->nullable();   // 0.0 – 5.0
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Batch tracking per inventory item (lot numbers, expiry, cost)
        Schema::create('inventory_batches', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('inventory_item_id')->index();
            $table->string('batch_number', 80);
            $table->unsignedBigInteger('supplier_id')->nullable()->index();
            $table->integer('quantity_received');
            $table->integer('quantity_remaining');
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->date('manufacture_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('status', 20)->default('active'); // active|exhausted|recalled|expired
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('inventory_item_id')->references('id')->on('inventory_items');
            $table->index(['branch_id', 'expiry_date']);
            $table->index(['branch_id', 'status']);
        });

        // Manual stock adjustments (write-offs, corrections, additions)
        Schema::create('stock_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('inventory_item_id')->index();
            $table->unsignedBigInteger('inventory_batch_id')->nullable()->index();
            $table->unsignedBigInteger('performed_by')->index();
            $table->integer('quantity_before');
            $table->integer('quantity_change');      // positive = addition, negative = deduction
            $table->integer('quantity_after');
            $table->string('reason', 60);            // received|dispensed|expired|damaged|transferred|correction
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('inventory_item_id')->references('id')->on('inventory_items');
        });

        // Purchase orders header
        Schema::create('purchase_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('po_number', 30)->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('supplier_id')->index();
            $table->unsignedBigInteger('raised_by')->index();
            $table->unsignedBigInteger('approved_by')->nullable()->index();
            $table->string('status', 30)->default('draft'); // draft|sent|acknowledged|shipped|received|cancelled
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->date('expected_delivery_date')->nullable();
            $table->date('delivered_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers');
            $table->index(['branch_id', 'status']);
        });

        // Line items within a purchase order
        Schema::create('purchase_order_items', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('purchase_order_id')->index();
            $table->unsignedBigInteger('inventory_item_id')->index();
            $table->integer('quantity_ordered');
            $table->integer('quantity_received')->default(0);
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->decimal('total_cost', 10, 2)->default(0);
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->cascadeOnDelete();
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('inventory_batches');
        Schema::dropIfExists('suppliers');
    }
};
