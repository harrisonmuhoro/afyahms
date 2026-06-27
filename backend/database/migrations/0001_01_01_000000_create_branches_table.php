<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->string('code', 8)->unique();         // NRB, KSM, etc.
            $table->string('name', 255);
            $table->string('address', 500)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->string('timezone', 64)->default('Africa/Nairobi');
            $table->char('currency', 3)->default('KES');
            $table->boolean('is_active')->default(true);
            $table->string('mpesa_shortcode', 32)->nullable();
            $table->string('sha_facility_code', 64)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};