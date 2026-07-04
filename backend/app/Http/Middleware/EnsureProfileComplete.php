<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureProfileComplete
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && $user->hasRole('patient') && !$user->profile_complete) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Profile incomplete.',
                    'redirect' => '/patient/complete-profile'
                ], 403);
            }
            return redirect('/patient/complete-profile');
        }

        return $next($request);
    }
}
