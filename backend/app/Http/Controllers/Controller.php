<?php

declare(strict_types=1);

namespace App\Http\Controllers;

/**
 * Thin abstract base controller. Domain code lives in modules —
 * this class only exists so Laravel's `Route::middleware('auth')`
 * can resolve a default controller type. Do NOT add logic here.
 */
abstract class Controller
{
    //
}