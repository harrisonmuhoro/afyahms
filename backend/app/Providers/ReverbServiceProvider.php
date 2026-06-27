<?php

declare(strict_types=1);

namespace App\Providers;

use Laravel\Reverb\Servers\Reverb\Server as ReverbServer;
use Reverb\Application;
use Illuminate\Support\ServiceProvider;

final class ReverbServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Reverb is configured via config/reverb.php (Laravel's defaults).
        // This provider exists so we can register custom channel classes later.
    }
}