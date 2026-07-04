<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('data_correction_requests')) {
            return;
        }

        Schema::create('data_correction_requests', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('requested_by')->nullable()->index();
            $table->string('record_type', 191);
            $table->unsignedBigInteger('record_id')->nullable();
            $table->string('field_name', 128)->nullable();
            $table->text('requested_value')->nullable();
            $table->text('reason');
            $table->string('status', 32)->default('pending')->index();
            $table->unsignedBigInteger('reviewed_by')->nullable()->index();
            $table->text('review_reason')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->foreign('requested_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['record_type', 'record_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_correction_requests');
    }
};
