<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Force HTTPS in non-local environments
        if (! app()->isLocal()) {
            URL::forceScheme('https');
        }

        // Money/decimal helpers — wire commonly-used customs globally
        \Illuminate\Database\Eloquent\Model::unguard(false);

        // Eloquent strict mode for development
        if (app()->isLocal()) {
            \Illuminate\Database\Eloquent\Model::preventLazyLoading();
        }
    }
}