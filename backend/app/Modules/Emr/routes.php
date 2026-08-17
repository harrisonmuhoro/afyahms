<?php

declare(strict_types=1);

use App\Modules\Emr\Controllers\EmrController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'break.glass'])->group(function (): void {

    // ✅ SPECIFIC routes BEFORE wildcard {id} routes
    Route::get('/encounters/visit/{visitId}',  [EmrController::class, 'byVisit'])
        ->whereNumber('visitId')
        ->middleware('permission:emr.read')
        ->name('encounters.by-visit');

    Route::get('/patients/{patientId}/encounters', [EmrController::class, 'history'])
        ->whereNumber('patientId')
        ->middleware('permission:emr.view-history')
        ->name('encounters.history');

    // Wildcard {id} routes AFTER specific ones
    Route::post('/encounters',                 [EmrController::class, 'store'])
        ->middleware('permission:emr.create')
        ->name('encounters.store');

    Route::get('/encounters/{id}',             [EmrController::class, 'show'])
        ->whereNumber('id')
        ->middleware('permission:emr.read')
        ->name('encounters.show');

    Route::post('/encounters/{id}/complete',   [EmrController::class, 'complete'])
        ->whereNumber('id')
        ->middleware('permission:emr.update')
        ->name('encounters.complete');

    // SOAP note
    Route::put('/encounters/{id}/soap',        [EmrController::class, 'saveSoap'])
        ->whereNumber('id')
        ->middleware('permission:emr.update')
        ->name('encounters.soap.save');

    Route::post('/encounters/{id}/soap/sign',  [EmrController::class, 'signSoap'])
        ->whereNumber('id')
        ->middleware('permission:emr.sign')
        ->name('encounters.soap.sign');

    Route::post('/encounters/{id}/soap/amend', [EmrController::class, 'amendSoap'])
        ->whereNumber('id')
        ->middleware('permission:emr.amend')
        ->name('encounters.soap.amend');

    Route::post('/encounters/{id}/soap/acknowledge', [EmrController::class, 'acknowledgeSoap'])
        ->whereNumber('id')
        ->middleware('permission:emr.acknowledge')
        ->name('encounters.soap.acknowledge');

    // Diagnoses
    Route::post('/encounters/{id}/diagnoses',  [EmrController::class, 'addDiagnosis'])
        ->whereNumber('id')
        ->middleware('permission:diagnoses.create')
        ->name('encounters.diagnoses.add');

    Route::delete('/diagnoses/{id}',           [EmrController::class, 'removeDiagnosis'])
        ->whereNumber('id')
        ->middleware('permission:diagnoses.delete')
        ->name('diagnoses.remove');

    // ICD-10 catalog
    Route::get('/diagnoses-catalog',           [EmrController::class, 'searchCatalog'])
        ->middleware('permission:diagnoses.read')
        ->name('diagnoses.catalog.search');
});
