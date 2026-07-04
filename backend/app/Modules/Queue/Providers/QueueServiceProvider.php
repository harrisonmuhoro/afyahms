<?php

declare(strict_types=1);

namespace App\Modules\Queue\Providers;

use App\Modules\Queue\Repositories\Contracts\QueueRepository;
use App\Modules\Queue\Repositories\Eloquent\EloquentQueueRepository;
use App\Modules\Queue\Services\QueueService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Modules\Queue\Models\QueueTicket;
use App\Modules\Queue\Policies\QueueTicketPolicy;

final class QueueServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(QueueRepository::class, EloquentQueueRepository::class);
        $this->app->singleton(QueueService::class);
    }

    public function boot(): void
    {
        Gate::policy(QueueTicket::class, QueueTicketPolicy::class);
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
