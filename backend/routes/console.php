<?php

declare(strict_types=1);

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', fn () => $this->comment(Inspiring::quote()))->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Schedule
|--------------------------------------------------------------------------
| Foundation §7 — retention/archive, claim polling, cache warm, etc.
| Each phase will add its own scheduled tasks. The scheduler container
| dispatches via `php artisan schedule:run` (cron entry point).
*/

app(Schedule::class)
    ->command('queue:prune-failed --hours=72')->daily();
app(Schedule::class)
    ->command('cache:prune-stale-tags')->hourly();
app(Schedule::class)
    ->command('staff:purge-expired-contact-changes')->hourly();
