<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('emar_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained('visits')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('medication_id')->constrained('medications')->cascadeOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            
            $table->string('dose');
            $table->string('route');
            $table->string('frequency')->nullable();
            
            $table->dateTime('scheduled_time');
            $table->dateTime('administered_time')->nullable();
            $table->foreignId('administered_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->enum('status', ['pending', 'given', 'refused', 'omitted'])->default('pending');
            $table->text('notes')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emar_records');
    }
};
