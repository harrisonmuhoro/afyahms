<?php

declare(strict_types=1);

use App\Modules\Queue\Controllers\QueueController;
use Illuminate\Support\Facades\Route;

/*
 * Queue pipeline routes per docs/12-api-specification.md.
 *
 * Permissions match docs/08-rbac-matrix.md canonical names.
 * Visit routes are mounted under /visits (visit is the cross-cutting chain).
 */

Route::middleware(['auth:sanctum'])->group(function (): void {

    // Station + board
    Route::get('/queue/stations',                     [QueueController::class, 'stations'])->name('queue.stations.index');
    Route::get('/queue/boards/{code}',                [QueueController::class, 'board'])->where('code', 'REC|TRI|DOC|LAB|PHA|BIL|RAD')->name('queue.boards.show');
    Route::get('/queue/boards/{code}/public',         [QueueController::class, 'publicBoard'])->where('code', 'REC|TRI|DOC|LAB|PHA|BIL|RAD')->name('queue.boards.public');

    // Visits
    Route::post('/visits',                            [QueueController::class, 'openVisit'])->middleware('permission:visits.create')->name('queue.visits.store');
    Route::get('/visits/{id}',                        [QueueController::class, 'showVisit'])->whereNumber('id')->name('queue.visits.show');

    // Station actions
    Route::post('/queue/stations/{stationId}/call-next', [QueueController::class, 'callNext'])->whereNumber('stationId')->middleware('permission:queue.call-next')->name('queue.stations.call-next');

    // Ticket actions
    Route::post('/queue/tickets/{ticketId}/start',         [QueueController::class, 'startServing'])->whereNumber('ticketId')->middleware('permission:queue.manage')->name('queue.tickets.start');
    Route::post('/queue/tickets/{ticketId}/complete',      [QueueController::class, 'complete'])->whereNumber('ticketId')->middleware('permission:queue.manage')->name('queue.tickets.complete');
    Route::post('/queue/tickets/{ticketId}/hold',           [QueueController::class, 'hold'])->whereNumber('ticketId')->middleware('permission:queue.manage')->name('queue.tickets.hold');
    Route::post('/queue/tickets/{ticketId}/resume',         [QueueController::class, 'resume'])->whereNumber('ticketId')->middleware('permission:queue.manage')->name('queue.tickets.resume');
    Route::post('/queue/tickets/{ticketId}/no-show',        [QueueController::class, 'noShow'])->whereNumber('ticketId')->middleware('permission:queue.manage')->name('queue.tickets.no-show');
    Route::post('/queue/tickets/{ticketId}/emergency-bypass',[QueueController::class, 'emergencyBypass'])->whereNumber('ticketId')->middleware('permission:queue.override-priority')->name('queue.tickets.emergency-bypass');
    Route::post('/queue/tickets/{ticketId}/mts',            [QueueController::class, 'updateMts'])->whereNumber('ticketId')->middleware('permission:triage.assign-category')->name('queue.tickets.mts');
});
