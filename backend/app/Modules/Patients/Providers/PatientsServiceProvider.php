<?php

declare(strict_types=1);

namespace App\Modules\Patients\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class PatientsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'active.branch'])
            ->prefix('api/v1/patients')
            ->name('patients.')
            ->group(__DIR__.'/../routes.php');
    }
}