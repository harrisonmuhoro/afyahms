<?php

declare(strict_types=1);

use App\Modules\Appointments\Controllers\AppointmentController;
use App\Modules\Appointments\Controllers\ScheduleController;
use App\Modules\Appointments\Controllers\SlotController;
use App\Modules\Appointments\Controllers\Portal\PatientAppointmentController;
use App\Modules\Appointments\Controllers\HolidayController;
use Illuminate\Support\Facades\Route;

// Staff Routes (require Sanctum auth)
Route::middleware(['api', 'auth:sanctum'])->prefix('api/v1/appointments')->group(function () {
    // Schedules
    Route::apiResource('schedules', ScheduleController::class);
    
    // Slots
    Route::get('slots/calendar', [SlotController::class, 'calendar']);
    Route::get('slots', [SlotController::class, 'index']);

    // Specification-compatible patient portal aliases.
    Route::middleware(['role:patient', 'permission:portal.access'])->prefix('portal')->group(function () {
        Route::get('doctors', [PatientAppointmentController::class, 'doctors']);
        Route::get('slots', [PatientAppointmentController::class, 'slots']);
        Route::post('book', [PatientAppointmentController::class, 'store']);
        Route::get('my-appointments', [PatientAppointmentController::class, 'index']);
        Route::patch('{appointment}/cancel', [PatientAppointmentController::class, 'cancel']);
    });

    // Appointments (Core CRUD)
    Route::apiResource('/', AppointmentController::class)->parameters(['' => 'appointment']);
    
    // Appointment Actions
    Route::patch('{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::patch('{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::patch('{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::patch('{appointment}/check-in', [AppointmentController::class, 'checkIn']);
    Route::patch('{appointment}/no-show', [AppointmentController::class, 'noShow']);
    Route::get('{appointment}/reminders', [AppointmentController::class, 'reminders']);
    Route::post('{appointment}/reminders', [AppointmentController::class, 'triggerReminder']);

    // Schedule exceptions
    Route::post('schedules/{schedule}/overrides', [ScheduleController::class, 'addOverride']);
    Route::delete('schedules/{schedule}/overrides/{date}', [ScheduleController::class, 'removeOverride']);
    Route::get('holidays', [HolidayController::class, 'index']);
    Route::post('holidays', [HolidayController::class, 'store']);
    Route::delete('holidays/{holiday}', [HolidayController::class, 'destroy']);
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
    Route::patch('{appointment}/cancel', [PatientAppointmentController::class, 'cancel']);
    });
