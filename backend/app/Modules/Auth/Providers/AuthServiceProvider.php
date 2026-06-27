<?php

declare(strict_types=1);

namespace App\Modules\Auth\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class AuthServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Route::middleware(['api', 'force.json', 'throttle:auth'])
            ->prefix('api/v1/auth')
            ->name('auth.')
            ->group(__DIR__.'/../routes.php');
    }
}