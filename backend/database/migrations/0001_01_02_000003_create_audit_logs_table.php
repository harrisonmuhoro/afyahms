<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('event', 128);                  // e.g. 'phi.access', 'document.uploaded'
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('causer_type')->nullable();
            $table->unsignedBigInteger('causer_id')->nullable();
            $table->json('properties')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();

            $table->index(['event', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index(['causer_id', 'created_at']);
            $table->index(['branch_id', 'created_at']);
        });

        // Spatie ActivityLog — schema published by package migration
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};