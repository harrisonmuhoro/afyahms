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
            'actor_role' => ! Schema::hasColumn('audit_logs', 'actor_role'),
            'action' => ! Schema::hasColumn('audit_logs', 'action'),
            'field_name' => ! Schema::hasColumn('audit_logs', 'field_name'),
            'old_value' => ! Schema::hasColumn('audit_logs', 'old_value'),
            'new_value' => ! Schema::hasColumn('audit_logs', 'new_value'),
            'ip_address' => ! Schema::hasColumn('audit_logs', 'ip_address'),
            'user_agent' => ! Schema::hasColumn('audit_logs', 'user_agent'),
            'break_glass_reason' => ! Schema::hasColumn('audit_logs', 'break_glass_reason'),
        ];

        if (! in_array(true, $columns, true)) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) use ($columns): void {
            if ($columns['actor_role']) {
                $table->string('actor_role', 128)->nullable()->after('causer_id');
            }

            if ($columns['action']) {
                $table->string('action', 128)->nullable()->after('event');
            }

            if ($columns['field_name']) {
                $table->string('field_name', 128)->nullable()->after('subject_id');
            }

            if ($columns['old_value']) {
                $table->text('old_value')->nullable()->after('field_name');
            }

            if ($columns['new_value']) {
                $table->text('new_value')->nullable()->after('old_value');
            }

            if ($columns['ip_address']) {
                $table->string('ip_address', 45)->nullable()->after('actor_role');
            }

            if ($columns['user_agent']) {
                $table->string('user_agent', 1024)->nullable()->after('ip_address');
            }

            if ($columns['break_glass_reason']) {
                $table->text('break_glass_reason')->nullable()->after('user_agent');
            }
        });
    }

    public function down(): void
    {
        $drop = [];

        foreach ([
            'break_glass_reason',
            'user_agent',
            'ip_address',
            'new_value',
            'old_value',
            'field_name',
            'action',
            'actor_role',
        ] as $column) {
            if (Schema::hasColumn('audit_logs', $column)) {
                $drop[] = $column;
            }
        }

        if ($drop === []) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) use ($drop): void {
            $table->dropColumn($drop);
        });
    }
};
