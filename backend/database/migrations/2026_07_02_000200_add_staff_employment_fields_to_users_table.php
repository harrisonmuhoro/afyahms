<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = [
            'national_id' => ! Schema::hasColumn('users', 'national_id'),
            'date_of_birth' => ! Schema::hasColumn('users', 'date_of_birth'),
            'staff_id' => ! Schema::hasColumn('users', 'staff_id'),
            'department' => ! Schema::hasColumn('users', 'department'),
            'specialization' => ! Schema::hasColumn('users', 'specialization'),
            'license_number' => ! Schema::hasColumn('users', 'license_number'),
            'employment_type' => ! Schema::hasColumn('users', 'employment_type'),
            'employment_start_date' => ! Schema::hasColumn('users', 'employment_start_date'),
        ];

        if (! in_array(true, $columns, true)) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns): void {
            if ($columns['national_id']) {
                $table->string('national_id')->nullable()->after('profile_photo_path');
            }

            if ($columns['date_of_birth']) {
                $table->date('date_of_birth')->nullable()->after('national_id');
            }

            if ($columns['staff_id']) {
                $table->string('staff_id', 80)->nullable()->unique()->after('date_of_birth');
            }

            if ($columns['department']) {
                $table->string('department', 120)->nullable()->after('staff_id');
            }

            if ($columns['specialization']) {
                $table->string('specialization', 120)->nullable()->after('department');
            }

            if ($columns['license_number']) {
                $table->string('license_number', 120)->nullable()->after('specialization');
            }

            if ($columns['employment_type']) {
                $table->string('employment_type', 32)->nullable()->after('license_number');
            }

            if ($columns['employment_start_date']) {
                $table->date('employment_start_date')->nullable()->after('employment_type');
            }
        });
    }

    public function down(): void
    {
        $drop = array_values(array_filter([
            Schema::hasColumn('users', 'employment_start_date') ? 'employment_start_date' : null,
            Schema::hasColumn('users', 'employment_type') ? 'employment_type' : null,
            Schema::hasColumn('users', 'license_number') ? 'license_number' : null,
            Schema::hasColumn('users', 'specialization') ? 'specialization' : null,
            Schema::hasColumn('users', 'department') ? 'department' : null,
            Schema::hasColumn('users', 'staff_id') ? 'staff_id' : null,
            Schema::hasColumn('users', 'date_of_birth') ? 'date_of_birth' : null,
            Schema::hasColumn('users', 'national_id') ? 'national_id' : null,
        ]));

        if ($drop === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($drop): void {
            $table->dropColumn($drop);
        });
    }
};
