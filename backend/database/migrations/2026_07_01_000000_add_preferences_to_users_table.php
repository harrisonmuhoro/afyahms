<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $needsLocale = ! Schema::hasColumn('users', 'locale');
        $needsTheme = ! Schema::hasColumn('users', 'theme');

        if (! $needsLocale && ! $needsTheme) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($needsLocale, $needsTheme): void {
            if ($needsLocale) {
                $table->string('locale', 8)->default((string) config('hospital.locale', 'en'));
            }

            if ($needsTheme) {
                $table->string('theme', 16)->default('system');
            }
        });
    }

    public function down(): void
    {
        $columns = [];

        if (Schema::hasColumn('users', 'locale')) {
            $columns[] = 'locale';
        }

        if (Schema::hasColumn('users', 'theme')) {
            $columns[] = 'theme';
        }

        if ($columns === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns): void {
            $table->dropColumn($columns);
        });
    }
};
