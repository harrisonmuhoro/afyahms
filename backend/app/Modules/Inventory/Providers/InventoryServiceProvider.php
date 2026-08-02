<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Providers;

use App\Modules\Inventory\Services\InventoryService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class InventoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(InventoryService::class);
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
