<?php

declare(strict_types=1);

use App\Modules\Queue\Controllers\QueueController;
use App\Modules\Queue\Controllers\StationCheckInController;
use Illuminate\Support\Facades\Route;

/*
 * Queue pipeline routes per docs/12-api-specification.md.
 *
 * Permissions match docs/08-rbac-matrix.md canonical names.
 * Visit routes are mounted under /visits (visit is the cross-cutting chain).
 */

Route::middleware(['auth:sanctum'])->group(function (): void {

    // Station + board
    Route::get('/queue/kpis',                         [QueueController::class, 'kpis'])->middleware('permission:queue.read')->name('queue.kpis');
    Route::get('/queue/stations',                     [QueueController::class, 'stations'])->middleware('permission:queue.read')->name('queue.stations.index');
    Route::get('/queue/boards/{code}',                [QueueController::class, 'board'])->where('code', 'REC|TRI|DOC|LAB|PHA|BIL|RAD')->middleware('permission:queue.read')->name('queue.boards.show');
    Route::get('/queue/boards/{code}/public',         [QueueController::class, 'publicBoard'])->where('code', 'REC|TRI|DOC|LAB|PHA|BIL|RAD')->middleware('permission:queue.read')->name('queue.boards.public');

    // Visits
    Route::post('/visits',                            [QueueController::class, 'openVisit'])->middleware('permission:visits.create')->name('queue.visits.store');
    Route::get('/visits/{id}',                        [QueueController::class, 'showVisit'])->whereNumber('id')->middleware('permission:visits.read')->name('queue.visits.show');

    // Station actions
    Route::post('/queue/stations/{stationId}/call-next', [QueueController::class, 'callNext'])->whereNumber('stationId')->middleware('permission:queue.call-next')->name('queue.stations.call-next');
    Route::post('/queue/stations/{stationId}/check-in',  [StationCheckInController::class, 'checkIn'])->whereNumber('stationId')->middleware('permission:queue.advance')->name('queue.stations.check-in');
    Route::post('/queue/stations/{stationId}/check-out', [StationCheckInController::class, 'checkOut'])->whereNumber('stationId')->middleware('permission:queue.advance')->name('queue.stations.check-out');

    // Ticket actions
    Route::post('/queue/tickets/{ticketId}/start',         [QueueController::class, 'startServing'])->whereNumber('ticketId')->middleware('permission:queue.advance')->name('queue.tickets.start');
    Route::post('/queue/tickets/{ticketId}/complete',      [QueueController::class, 'complete'])->whereNumber('ticketId')->middleware('permission:queue.advance')->name('queue.tickets.complete');
    Route::post('/queue/tickets/{ticketId}/hold',           [QueueController::class, 'hold'])->whereNumber('ticketId')->middleware('permission:queue.advance')->name('queue.tickets.hold');
    Route::post('/queue/tickets/{ticketId}/resume',         [QueueController::class, 'resume'])->whereNumber('ticketId')->middleware('permission:queue.advance')->name('queue.tickets.resume');
    Route::post('/queue/tickets/{ticketId}/no-show',        [QueueController::class, 'noShow'])->whereNumber('ticketId')->middleware('permission:queue.advance')->name('queue.tickets.no-show');
    Route::post('/queue/tickets/{ticketId}/emergency-bypass',[QueueController::class, 'emergencyBypass'])->whereNumber('ticketId')->middleware('permission:queue.override-priority')->name('queue.tickets.emergency-bypass');
    Route::post('/queue/tickets/{ticketId}/mts',            [QueueController::class, 'updateMts'])->whereNumber('ticketId')->middleware('permission:triage.assign-category')->name('queue.tickets.mts');
});
