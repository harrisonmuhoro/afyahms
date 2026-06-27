<?php

declare(strict_types=1);

namespace App\Modules\Documents;

final class Module
{
    public static function register(\Illuminate\Contracts\Container\Container $app): void
    {
        $app->singleton(\App\Modules\Documents\Services\DocumentService::class);
    }

    public static function boot(\Illuminate\Contracts\Container\Container $app): void
    {
        //
    }
}