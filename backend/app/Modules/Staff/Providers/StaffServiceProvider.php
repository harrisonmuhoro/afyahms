<?php

declare(strict_types=1);

namespace App\Modules\Staff\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class StaffServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'active.branch'])
            ->prefix('api/v1/staff')
            ->name('staff.')
            ->group(__DIR__.'/../routes.php');
    }
}
