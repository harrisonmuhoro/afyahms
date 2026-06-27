<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

/**
 * Sanctum's stateful auth needs CSRF on the cookie session. This is the
 * default Laravel CSRF middleware aliased for the SPA flow.
 */
final class VerifyCsrfToken extends Middleware
{
    /** @var array<int, string> */
    protected $except = [
        // Webhooks (M-Pesa, SHA, etc.) — they use signed payloads, not CSRF.
        'api/v1/webhooks/*',
    ];
}