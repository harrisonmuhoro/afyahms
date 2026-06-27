<?php

declare(strict_types=1);

namespace App\Modules\Admin\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class AdminServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'active.branch', 'branch.scope', 'mfa.confirmed'])
            ->prefix('api/v1')
            ->name('admin.')
            ->group(__DIR__.'/../routes.php');
    }
}