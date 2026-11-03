<?php

declare(strict_types=1);

namespace App\Modules\Emr\Providers;

use App\Modules\Emr\Models\EmarRecord;
use App\Modules\Emr\Policies\EmarRecordPolicy;
use App\Modules\Emr\Repositories\Contracts\DiagnosisCatalogRepository;
use App\Modules\Emr\Repositories\Contracts\EncounterRepository;
use App\Modules\Emr\Repositories\Eloquent\EloquentDiagnosisCatalogRepository;
use App\Modules\Emr\Repositories\Eloquent\EloquentEncounterRepository;
use App\Modules\Emr\Services\EmrService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class EmrServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(EncounterRepository::class, EloquentEncounterRepository::class);
        $this->app->singleton(DiagnosisCatalogRepository::class, EloquentDiagnosisCatalogRepository::class);
        $this->app->singleton(EmrService::class);
    }

    public function boot(): void
    {
        Gate::policy(EmarRecord::class, EmarRecordPolicy::class);
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
