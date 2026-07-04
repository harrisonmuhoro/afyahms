<?php

use App\Modules\PatientPortal\Controllers\PortalDataCorrectionRequestController;
use App\Modules\PatientPortal\Controllers\PortalDemographicsController;
use App\Modules\Patients\Resources\PatientResource;
use Illuminate\Support\Facades\Route;

/**
 * Patient Portal API Routes
 * 
 * Prefix: /api/v1/portal
 * Rate Limited to 60 req/min via 'portal-api'
 */
Route::prefix('api/v1/portal')
    ->middleware(['api', 'auth:sanctum', 'throttle:portal-api', 'role:patient', 'permission:portal.access'])
    ->group(function () {
        
        Route::get('/me', function (\Illuminate\Http\Request $request) {
            $patient = $request->user()?->patient;
            if ($patient === null) {
                abort(403, 'No patient record is linked to this account.');
            }

            return response()->json([
                'patient' => (new PatientResource($patient))->resolve($request),
            ]);
        });

        Route::patch('/me/demographics', [PortalDemographicsController::class, 'update'])
            ->middleware('permission:portal.demographics.update');

        Route::get('/correction-requests', [PortalDataCorrectionRequestController::class, 'index'])
            ->middleware('permission:data-corrections.create');

        Route::post('/correction-requests', [PortalDataCorrectionRequestController::class, 'store'])
            ->middleware('permission:data-corrections.create');

    });
