<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

final class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/';

    public function boot(): void
    {
        $this->configureRateLimiting();
        // ❌ REMOVED: $this->loadModuleRoutes()
        // Each module's ServiceProvider loads its own routes with
        // correct prefix and middleware. No central loader needed.
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return [
                Limit::perMinute(120)->by(optional($request->user())->id ?: $request->ip()),
            ];
        });

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

        RateLimiter::for('portal-api', fn (Request $r) => [
            Limit::perMinute(60)->by(optional($r->user())->id ?: $r->ip()),
        ]);
    }
}