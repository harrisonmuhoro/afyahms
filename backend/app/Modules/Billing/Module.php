<?php

declare(strict_types=1);

namespace App\Modules\Billing;

final class Module
{
    public static function register(\Illuminate\Contracts\Container\Container $app): void {}

    public static function boot(\Illuminate\Contracts\Container\Container $app): void
    {
        // Service providers are auto-registered by App\Providers\ModuleServiceProvider.
    }
}