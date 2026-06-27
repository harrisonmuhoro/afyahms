<?php

declare(strict_types=1);

namespace App\Modules\Documents\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class DocumentsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'active.branch'])
            ->prefix('api/v1/documents')
            ->name('documents.')
            ->group(__DIR__.'/../routes.php');
    }
}