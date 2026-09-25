<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_public_holidays', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->date('holiday_date');
            $table->string('name', 160);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['branch_id', 'holiday_date']);
            $table->index(['branch_id', 'holiday_date', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_public_holidays');
    }
};
