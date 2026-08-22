<?php

declare(strict_types=1);

namespace App\Modules\Messages\Providers;

use Illuminate\Support\ServiceProvider;

final class MessagesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../routes.php');
    }
}
