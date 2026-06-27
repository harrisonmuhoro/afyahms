<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id')->index();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->morphs('documentable');                // patient, encounter, lab_order, ...
            $table->string('disk', 32);                    // 's3' | 'r2' | 'b2' | 'local'
            $table->string('path', 1024);
            $table->string('mime_type', 128);
            $table->unsignedBigInteger('size_bytes');
            $table->string('original_filename', 255);
            $table->string('category', 64)->default('general'); // clinical, lab, radiology, ...
            $table->json('metadata')->nullable();
            $table->string('checksum_sha256', 64)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};