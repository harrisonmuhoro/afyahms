<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\VerificationController;
use App\Http\Controllers\PharmacyController;
use App\Modules\Communication\Controllers\NotificationController;
use App\Modules\Documents\Controllers\DocumentsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Top-level API routes
|--------------------------------------------------------------------------
| Module-specific routes are auto-loaded by RouteServiceProvider from
| Modules/{Module}/routes.php and mount under their own prefix. This
| file holds only top-level cross-cutting routes (health, version, etc).
*/

Route::prefix('v1')->name('api.')->group(function () {

    // ── Notifications ────────────────────────────────────────────────────────
    Route::prefix('notifications')
        ->middleware(['auth:sanctum'])
        ->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::post('/test', [NotificationController::class, 'generateTestNotifications']);
            Route::post('/trigger-expiring-check', [NotificationController::class, 'triggerExpiringCheck']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
            Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        });

    // ── Account & Security ─────────────────────────────────────────────────
    Route::prefix('account')
        ->name('account.')
        ->middleware(['auth:sanctum', 'throttle:60,1'])
        ->group(function () {
            Route::post('send-otp',   [VerificationController::class, 'send'])
                ->name('send-otp');
            Route::post('verify-otp', [VerificationController::class, 'verify'])
                ->name('verify-otp');
        });

    // ── Pharmacy (temporary — move to Pharmacy module) ─────────────────────
    Route::prefix('pharmacy')
        ->middleware(['auth:sanctum'])
        ->group(function () {


            Route::get('/medications', [PharmacyController::class, 'getMedications'])
                ->middleware('permission:pharmacy.view-stock');
            Route::post('/medications', [PharmacyController::class, 'storeMedication'])
                ->middleware('permission:pharmacy.manage-catalog');
            Route::get('/prescriptions', [PharmacyController::class, 'getPrescriptions'])
                ->middleware('permission:prescriptions.read');
            Route::post('/prescriptions', [PharmacyController::class, 'storePrescription'])
                ->middleware('permission:prescriptions.create');
            Route::put('/prescriptions/{id}/status', [PharmacyController::class, 'updatePrescriptionStatus'])
                ->middleware('permission:prescriptions.dispense');
        });
});

// Catch-all: signed document downloads via the local-disk fallback.
// Intentionally outside v1 prefix — signed URLs must remain stable.
Route::get('documents/signed/{disk}/{path}', [DocumentsController::class, 'show'])
    ->middleware('signed')
    ->where('path', '.*')
    ->name('documents.signed');