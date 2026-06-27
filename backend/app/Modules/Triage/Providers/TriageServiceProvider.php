<?php

declare(strict_types=1);

namespace App\Modules\Triage\Providers;

use App\Modules\Triage\Repositories\Contracts\TriageRepository;
use App\Modules\Triage\Repositories\Eloquent\EloquentTriageRepository;
use App\Modules\Triage\Services\TriageService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class TriageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TriageRepository::class, EloquentTriageRepository::class);
        $this->app->singleton(TriageService::class);
    }

    public function boot(): void
    {
        $this->bootRoutes();
    }

    private function bootRoutes(): void
    {
        $routeFile = dirname(__DIR__).'/routes.php';
        if (! is_file($routeFile)) {
            return;
        }
        Route::middleware('api')
            ->prefix('api/v1')
            ->group($routeFile);
    }
}
