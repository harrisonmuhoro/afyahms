<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal;

use Illuminate\Support\Facades\Route;

final class Module
{
    public static function register(\Illuminate\Contracts\Container\Container $app): void {}

    public static function boot(\Illuminate\Contracts\Container\Container $app): void
    {
        Route::group([], __DIR__.'/routes.php');
    }
}
