<?php

declare(strict_types=1);

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
    // Up health-check is auto-registered via withRouting(health: '/up').
    
    // Pharmacy routes
    Route::prefix('pharmacy')->group(function () {
        Route::get('/medications', [\App\Http\Controllers\PharmacyController::class, 'getMedications']);
        Route::post('/medications', [\App\Http\Controllers\PharmacyController::class, 'storeMedication']);
        Route::get('/prescriptions', [\App\Http\Controllers\PharmacyController::class, 'getPrescriptions']);
        Route::post('/prescriptions', [\App\Http\Controllers\PharmacyController::class, 'storePrescription']);
        Route::put('/prescriptions/{id}/status', [\App\Http\Controllers\PharmacyController::class, 'updatePrescriptionStatus']);
    });
});

// Catch-all: signed document downloads via the local-disk fallback.
Route::get('documents/signed/{disk}/{path}', [\App\Modules\Documents\Controllers\DocumentsController::class, 'show'])
    ->middleware('signed')
    ->where('path', '.*')
    ->name('documents.signed');