<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

/**
 * Channel authorization for real-time broadcasts (queue boards, alerts, patient portal).
 * Channel definitions live in routes/channels.php; module services that broadcast
 * events do not need to know about this file.
 */
final class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Broadcast::routes(['middleware' => ['auth:sanctum']]);

        require base_path('routes/channels.php');
    }
}