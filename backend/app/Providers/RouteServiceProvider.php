<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\Finder\Finder;

final class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/';

    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->loadModuleRoutes();
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return [
                Limit::perMinute(120)->by(optional($request->user())->id ?: $request->ip()),
            ];
        });

        // Tightened limits for sensitive flows
        RateLimiter::for('auth', fn (Request $r) => [
            Limit::perMinute(10)->by($r->input('email').'|'.$r->ip()),
        ]);
        RateLimiter::for('mpesa-stk', fn (Request $r) => [
            Limit::perMinute(20)->by(optional($r->user())->id ?: $r->ip()),
        ]);
        RateLimiter::for('mfa-verify', fn (Request $r) => [
            Limit::perMinute(5)->by(optional($r->user())->id ?: $r->ip()),
        ]);
        RateLimiter::for('webhooks', fn (Request $r) => [
            Limit::perMinute(600)->by($r->ip()),
        ]);
    }

    /**
     * Auto-load route files for every Modules/{Module}/routes.php.
     * Each module registers its own API routes under its prefix.
     */
    protected function loadModuleRoutes(): void
    {
        $modulesPath = app_path('Modules');

        if (! is_dir($modulesPath)) {
            return;
        }

        foreach (Finder::create()->files()->in($modulesPath)->name('routes.php') as $file) {
            // Route file is responsible for its own prefix / middleware
            require $file->getRealPath();
        }
    }
}