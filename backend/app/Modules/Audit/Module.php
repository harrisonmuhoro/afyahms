<?php

declare(strict_types=1);

namespace App\Modules\Audit;

use Illuminate\Support\Facades\Route;

final class Module
{
    public static function register(\Illuminate\Contracts\Container\Container $app): void
    {
        //
    }

    public static function boot(\Illuminate\Contracts\Container\Container $app): void
    {
        // Spatie ActivityLog is configured via its own service provider;
        // this module just provides the immutable audit_logs writer.
        Route::group([], base_path('app/Modules/Audit/routes.php'));
    }
}
