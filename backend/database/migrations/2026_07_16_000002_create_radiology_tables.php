<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Imaging study catalog (modalities + body parts)
        Schema::create('imaging_studies', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 30)->unique();
            $table->string('modality', 40)->default('other');
            $table->string('body_part', 80)->default('');
            $table->text('description')->nullable();
            $table->text('preparation')->nullable();
            $table->decimal('price', 10, 2)->default(0)->unsigned();
            $table->unsignedInteger('turnaround_minutes')->default(120);
            $table->boolean('requires_contrast')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Per-visit imaging orders
        Schema::create('imaging_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('visit_id')->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('ordered_by')->index();
            $table->unsignedBigInteger('imaging_study_id')->index();
            $table->string('status', 30)->default('pending');
            $table->string('priority', 20)->default('routine');
            $table->text('clinical_indication')->nullable();
            $table->boolean('contrast_used')->default(false);
            $table->string('contrast_agent', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('acquired_at')->nullable();
            $table->timestamp('reported_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('imaging_study_id')->references('id')->on('imaging_studies');
            $table->index(['branch_id', 'status']);
            $table->index(['visit_id', 'status']);
        });

        // Radiologist reports
        Schema::create('imaging_reports', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('imaging_order_id')->unique(); // 1:1 with order
            $table->unsignedBigInteger('reported_by')->index();
            $table->text('technique');
            $table->text('findings');
            $table->text('impression');
            $table->text('recommendations')->nullable();
            $table->string('status', 30)->default('draft');   // draft|final|amended
            $table->boolean('is_critical')->default(false);
            $table->text('critical_notes')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('imaging_order_id')->references('id')->on('imaging_orders');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imaging_reports');
        Schema::dropIfExists('imaging_orders');
        Schema::dropIfExists('imaging_studies');
    }
};
