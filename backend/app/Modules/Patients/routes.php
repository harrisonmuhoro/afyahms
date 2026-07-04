<?php

declare(strict_types=1);

use App\Modules\Patients\Controllers\AllergyController;
use App\Modules\Patients\Controllers\DataCorrectionRequestController;
use App\Modules\Patients\Controllers\NextOfKinController;
use App\Modules\Patients\Controllers\PatientController;
use App\Modules\Patients\Controllers\PatientInsuranceController;
use App\Modules\Patients\Controllers\PatientSearchController;
use Illuminate\Support\Facades\Route;

// Search MUST be declared before the {uuid} catch-all so it doesn't match.
Route::middleware(['permission:patients.read'])
    ->get('/search', PatientSearchController::class)
    ->name('search');

Route::middleware(['permission:patients.merge'])
    ->post('/merge', [PatientController::class, 'merge'])
    ->name('merge');

Route::middleware(['permission:data-corrections.review'])
    ->get('/data-correction-requests', [DataCorrectionRequestController::class, 'index'])
    ->name('data-correction-requests.index');

Route::middleware(['permission:data-corrections.review'])
    ->patch('/data-correction-requests/{correctionRequest}/review', [DataCorrectionRequestController::class, 'review'])
    ->name('data-correction-requests.review');

Route::middleware(['permission:patients.read'])
    ->get('/', [PatientController::class, 'index'])
    ->name('index');

Route::middleware(['permission:patients.create'])
    ->post('/', [PatientController::class, 'store'])
    ->name('store');

Route::middleware(['permission:patients.read'])
    ->get('/{uuid}', [PatientController::class, 'show'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('show');

Route::middleware(['permission:data-corrections.create'])
    ->post('/{uuid}/correction-requests', [DataCorrectionRequestController::class, 'store'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('correction-requests.store');

Route::middleware(['permission:patients.update'])
    ->patch('/{uuid}', [PatientController::class, 'update'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('update');

Route::middleware(['permission:patients.update'])
    ->put('/{uuid}', [PatientController::class, 'update'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('replace');

Route::middleware(['permission:patients.delete'])
    ->delete('/{uuid}', [PatientController::class, 'destroy'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('destroy');

// Next-of-kin
Route::middleware(['permission:patients.read'])
    ->get('/{uuid}/next-of-kin', [NextOfKinController::class, 'index'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('next-of-kin.index');

Route::middleware(['permission:patients.update'])
    ->post('/{uuid}/next-of-kin', [NextOfKinController::class, 'store'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('next-of-kin.store');

Route::middleware(['permission:patients.update'])
    ->put('/{uuid}/next-of-kin/{nokId}', [NextOfKinController::class, 'update'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('next-of-kin.update');

Route::middleware(['permission:patients.update'])
    ->delete('/{uuid}/next-of-kin/{nokId}', [NextOfKinController::class, 'destroy'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('next-of-kin.destroy');

// Insurance
Route::middleware(['permission:patients.read'])
    ->get('/{uuid}/insurance', [PatientInsuranceController::class, 'index'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('insurance.index');

Route::middleware(['permission:patients.update'])
    ->post('/{uuid}/insurance', [PatientInsuranceController::class, 'store'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('insurance.store');

Route::middleware(['permission:patients.update'])
    ->put('/{uuid}/insurance/{insuranceId}', [PatientInsuranceController::class, 'update'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('insurance.update');

Route::middleware(['permission:patients.update'])
    ->delete('/{uuid}/insurance/{insuranceId}', [PatientInsuranceController::class, 'destroy'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('insurance.destroy');

// Allergies
Route::middleware(['permission:patients.read'])
    ->get('/{uuid}/allergies', [AllergyController::class, 'index'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('allergies.index');

Route::middleware(['permission:patients.update'])
    ->post('/{uuid}/allergies', [AllergyController::class, 'store'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('allergies.store');

Route::middleware(['permission:patients.update'])
    ->delete('/{uuid}/allergies/{allergyId}', [AllergyController::class, 'destroy'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('allergies.destroy');
