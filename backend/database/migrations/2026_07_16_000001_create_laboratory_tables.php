<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Lab test catalog
        Schema::create('lab_tests', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 30)->unique();
            $table->string('category', 60)->default('other');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->default(0)->unsigned();
            $table->unsignedInteger('turnaround_minutes')->default(60);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Individual test orders placed against a visit
        Schema::create('lab_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('visit_id')->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('ordered_by')->index();
            $table->unsignedBigInteger('lab_test_id')->index();
            $table->string('status', 30)->default('pending');
            $table->string('priority', 20)->default('routine');
            $table->text('clinical_notes')->nullable();
            $table->string('specimen_type', 40)->nullable();
            $table->timestamp('collected_at')->nullable();
            $table->timestamp('resulted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('lab_test_id')->references('id')->on('lab_tests');
            $table->index(['branch_id', 'status']);
            $table->index(['visit_id', 'status']);
        });

        // Results for each order
        Schema::create('lab_results', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('lab_order_id')->unique(); // 1:1 with order
            $table->unsignedBigInteger('reported_by')->index();
            $table->text('findings');
            $table->string('interpretation', 30)->nullable(); // normal|abnormal|critical
            $table->string('reference_range', 100)->nullable();
            $table->string('unit', 40)->nullable();
            $table->string('value', 100)->nullable();
            $table->boolean('is_critical')->default(false);
            $table->text('notes')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('lab_order_id')->references('id')->on('lab_orders');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_results');
        Schema::dropIfExists('lab_orders');
        Schema::dropIfExists('lab_tests');
    }
};
