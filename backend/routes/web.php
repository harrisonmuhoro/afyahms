<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Request;
use Symfony\Component\Finder\Finder;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Afya HMS is API-only — the only "web" routes that exist are:
|   - the storage symlink fallback (if used)
|   - the SPA fallback that returns the React index.html for any non-/api path
*/

// The Modules route provider auto-loads Modules/{Module}/routes.php and
// mounts each under its own prefix (already handled there). This file is
// intentionally empty for API-only modules.
Route::get('/', fn () => response()->json([
    'name'    => config('app.name'),
    'api'     => url('/api/v1'),
    'health'  => url('/up'),
    'horizon' => url('/horizon'),
]));

// Google Auth Callback alias to match user's GOOGLE_REDIRECT_URI configuration
Route::get('/auth/google/callback', [\App\Modules\Auth\Controllers\GoogleAuthController::class, 'callback']);