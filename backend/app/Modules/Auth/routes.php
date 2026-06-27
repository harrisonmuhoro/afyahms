<?php

declare(strict_types=1);

use App\Modules\Auth\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login'])->name('login');

// Protected
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/me',          [AuthController::class, 'me'])->name('me');
    Route::post('/logout',     [AuthController::class, 'logout'])->name('logout');
    Route::post('/password',   [AuthController::class, 'changePassword'])->name('password');

    Route::post('/branch/switch', [AuthController::class, 'switchBranch'])
        ->middleware('permission:branch.switch')
        ->name('branch.switch');

    Route::prefix('mfa')->name('mfa.')->group(function () {
        Route::post('/enroll',          [AuthController::class, 'mfaEnroll'])->name('enroll');
        Route::post('/enroll/verify',   [AuthController::class, 'mfaEnrollVerify'])->name('enroll.verify');
        Route::post('/confirm',         [AuthController::class, 'mfaConfirm'])
            ->middleware('throttle:mfa-verify')
            ->name('confirm');
        Route::post('/disable',         [AuthController::class, 'mfaDisable'])->name('disable');
    });
});