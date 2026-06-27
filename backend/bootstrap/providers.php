<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\ModuleServiceProvider::class,
    App\Providers\AuthServiceProvider::class,
    App\Providers\BroadcastServiceProvider::class,
    App\Providers\RouteServiceProvider::class,
    // Horizon/Reverb providers are infra-only and require packages that are
    // not installed in the local dev environment. They are registered in
    // production via `composer install` (full composer.json).
    // See backend/composer.local.json for the WAMP-friendly subset.
    // App\Providers\HorizonServiceProvider::class,
    // App\Providers\ReverbServiceProvider::class,
];