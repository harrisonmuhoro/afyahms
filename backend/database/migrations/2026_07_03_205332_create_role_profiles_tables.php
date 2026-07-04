<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $roles = [
        'doctor',
        'nurse',
        'receptionist',
        'records_officer',
        'pharmacist',
        'lab_technician',
        'radiologist',
        'cashier'
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->roles as $role) {
            $tableName = $role . '_profiles';
            Schema::create($tableName, function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
                $table->timestamps();

                // Ensure a user only has one profile per branch for a specific role
                $table->unique(['user_id', 'branch_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->roles as $role) {
            Schema::dropIfExists($role . '_profiles');
        }
    }
};
