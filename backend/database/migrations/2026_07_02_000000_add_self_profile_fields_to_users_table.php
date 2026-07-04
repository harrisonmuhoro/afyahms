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
            'address' => ! Schema::hasColumn('users', 'address'),
            'next_of_kin_name' => ! Schema::hasColumn('users', 'next_of_kin_name'),
            'next_of_kin_phone' => ! Schema::hasColumn('users', 'next_of_kin_phone'),
            'profile_photo_path' => ! Schema::hasColumn('users', 'profile_photo_path'),
        ];

        if (! in_array(true, $columns, true)) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns): void {
            if ($columns['address']) {
                $table->string('address', 500)->nullable()->after('phone');
            }

            if ($columns['next_of_kin_name']) {
                $table->string('next_of_kin_name', 200)->nullable()->after('address');
            }

            if ($columns['next_of_kin_phone']) {
                $table->string('next_of_kin_phone', 32)->nullable()->after('next_of_kin_name');
            }

            if ($columns['profile_photo_path']) {
                $table->string('profile_photo_path')->nullable()->after('next_of_kin_phone');
            }
        });
    }

    public function down(): void
    {
        $drop = array_values(array_filter([
            Schema::hasColumn('users', 'profile_photo_path') ? 'profile_photo_path' : null,
            Schema::hasColumn('users', 'next_of_kin_phone') ? 'next_of_kin_phone' : null,
            Schema::hasColumn('users', 'next_of_kin_name') ? 'next_of_kin_name' : null,
            Schema::hasColumn('users', 'address') ? 'address' : null,
        ]));

        if ($drop === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($drop): void {
            $table->dropColumn($drop);
        });
    }
};
