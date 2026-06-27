<?php

declare(strict_types=1);

use App\Modules\Triage\Controllers\TriageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function (): void {
    Route::post('/triage',                 [TriageController::class, 'store'])->middleware('permission:triage.create')->name('triage.store');
    Route::get('/triage/{id}',             [TriageController::class, 'show'])->whereNumber('id')->middleware('permission:triage.read')->name('triage.show');
    Route::get('/triage/visit/{visitId}',  [TriageController::class, 'byVisit'])->whereNumber('visitId')->middleware('permission:triage.read')->name('triage.by-visit');
    Route::get('/triage/patient/{patientId}/latest', [TriageController::class, 'latestForPatient'])->whereNumber('patientId')->middleware('permission:triage.read')->name('triage.patient.latest');
});
