<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Providers;

use App\Modules\Tenancy\Repositories\Contracts\BranchRepository;
use App\Modules\Tenancy\Repositories\Eloquent\EloquentBranchRepository;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class BranchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BranchRepository::class, EloquentBranchRepository::class);
    }

    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'active.branch'])
            ->prefix('api/v1/branches')
            ->name('branches.')
            ->group(__DIR__.'/../routes.php');
    }
}