<?php

declare(strict_types=1);

use App\Modules\Auth\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth')
    ->name('login');

Route::prefix('forgot-password')->name('forgot-password.')->group(function () {
    Route::post('/request', [\App\Modules\Auth\Controllers\ForgotPasswordController::class, 'requestReset'])->name('request');
    Route::post('/verify',  [\App\Modules\Auth\Controllers\ForgotPasswordController::class, 'verifyCode'])->name('verify');
    Route::post('/reset',   [\App\Modules\Auth\Controllers\ForgotPasswordController::class, 'resetPassword'])->name('reset');
});

Route::prefix('google')->name('google.')->group(function () {
    Route::get('/redirect', [\App\Modules\Auth\Controllers\GoogleAuthController::class, 'redirect'])
        ->middleware('throttle:60,1')
        ->name('redirect');
    Route::get('/callback', [\App\Modules\Auth\Controllers\GoogleAuthController::class, 'callback'])
        ->middleware('throttle:60,1')
        ->name('callback');
    Route::post('/complete-profile', [\App\Modules\Auth\Controllers\GoogleAuthController::class, 'completeProfile'])
        ->middleware(['auth:sanctum', 'throttle:5,1'])
        ->name('complete-profile');
});

// Protected
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/me',          [AuthController::class, 'me'])->name('me');
    Route::get('/preferences', [AuthController::class, 'preferences'])->name('preferences.show');
    Route::post('/logout',     [AuthController::class, 'logout'])->name('logout');
    Route::post('/password',   [AuthController::class, 'changePassword'])->name('password');
    Route::patch('/preferences', [AuthController::class, 'updatePreferences'])->name('preferences');

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
