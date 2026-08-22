<?php

declare(strict_types=1);

use App\Modules\Appointments\Controllers\AppointmentController;
use App\Modules\Appointments\Controllers\ScheduleController;
use App\Modules\Appointments\Controllers\SlotController;
use App\Modules\Appointments\Controllers\Portal\PatientAppointmentController;
use Illuminate\Support\Facades\Route;

// Staff Routes (require Sanctum auth)
Route::middleware(['api', 'auth:sanctum'])->prefix('api/v1/appointments')->group(function () {
    // Schedules
    Route::apiResource('schedules', ScheduleController::class);
    
    // Slots
    Route::get('slots', [SlotController::class, 'index']);

    // Appointments (Core CRUD)
    Route::apiResource('/', AppointmentController::class)->parameters(['' => 'appointment']);
    
    // Appointment Actions
    Route::post('{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::post('{appointment}/check-in', [AppointmentController::class, 'checkIn']);
});

// Patient Portal Routes (require Sanctum auth)
Route::middleware(['api', 'auth:sanctum', 'role:patient', 'permission:portal.access'])
    ->prefix('api/v1/portal/appointments')
    ->group(function () {
    Route::get('/', [PatientAppointmentController::class, 'index']);
    Route::get('doctors', [PatientAppointmentController::class, 'doctors']);
    Route::get('schedules', [PatientAppointmentController::class, 'schedules']);
    Route::get('slots', [PatientAppointmentController::class, 'slots']);
    Route::post('/', [PatientAppointmentController::class, 'store']);
    Route::post('{appointment}/cancel', [PatientAppointmentController::class, 'cancel']);
    });
