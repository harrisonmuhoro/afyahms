<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var array<int, string> */
    private array $roles = [
        'superadmin',
        'hospital-admin',
        'doctor',
    ];

    public function up(): void
    {
        $roleIds = DB::table('roles')
            ->whereIn('name', $this->roles)
            ->pluck('id')
            ->all();

        if ($roleIds === []) {
            return;
        }

        $userIds = DB::table('model_has_roles')
            ->whereIn('role_id', $roleIds)
            ->where('model_type', 'App\\Models\\User')
            ->pluck('model_id')
            ->unique()
            ->values()
            ->all();

        if ($userIds === []) {
            return;
        }

        DB::table('users')
            ->whereIn('id', $userIds)
            ->update([
                'mfa_enabled' => false,
                'mfa_confirmed_at' => null,
                'updated_at' => now(),
            ]);

        DB::table('user_mfa')
            ->whereIn('user_id', $userIds)
            ->delete();
    }

    public function down(): void
    {
        // Intentionally not reversible: disabling a login challenge is a product policy change,
        // and previous TOTP secrets cannot be safely reconstructed.
    }
};
