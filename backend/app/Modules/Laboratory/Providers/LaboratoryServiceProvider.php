<?php

declare(strict_types=1);

namespace App\Modules\Laboratory\Providers;

use App\Modules\Laboratory\Services\LaboratoryService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class LaboratoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(LaboratoryService::class);
    }

    public function boot(): void
    {
        $this->bootRoutes();
    }

    private function bootRoutes(): void
    {
        $routeFile = dirname(__DIR__) . '/routes.php';
        if (! is_file($routeFile)) {
            return;
        }
        Route::middleware('api')
            ->prefix('api/v1')
            ->group($routeFile);
    }
}
