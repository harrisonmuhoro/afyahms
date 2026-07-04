<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $needsIsActive = ! Schema::hasColumn('users', 'is_active');
        $needsDeactivatedAt = ! Schema::hasColumn('users', 'deactivated_at');
        $needsDeactivatedReason = ! Schema::hasColumn('users', 'deactivated_reason');
        $needsDeactivatedBy = ! Schema::hasColumn('users', 'deactivated_by');

        if (! $needsIsActive && ! $needsDeactivatedAt && ! $needsDeactivatedReason && ! $needsDeactivatedBy) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use (
            $needsIsActive,
            $needsDeactivatedAt,
            $needsDeactivatedReason,
            $needsDeactivatedBy,
        ): void {
            if ($needsIsActive) {
                $table->boolean('is_active')->default(true)->after('locked_until');
            }

            if ($needsDeactivatedAt) {
                $table->timestamp('deactivated_at')->nullable()->after('is_active');
            }

            if ($needsDeactivatedReason) {
                $table->text('deactivated_reason')->nullable()->after('deactivated_at');
            }

            if ($needsDeactivatedBy) {
                $table->unsignedBigInteger('deactivated_by')->nullable()->after('deactivated_reason');
                $table->foreign('deactivated_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        $columns = [];

        if (Schema::hasColumn('users', 'deactivated_by')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropForeign(['deactivated_by']);
            });
            $columns[] = 'deactivated_by';
        }

        foreach (['deactivated_reason', 'deactivated_at', 'is_active'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                $columns[] = $column;
            }
        }

        if ($columns === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns): void {
            $table->dropColumn($columns);
        });
    }
};
