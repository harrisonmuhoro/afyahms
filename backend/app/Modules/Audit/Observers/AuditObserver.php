<?php

declare(strict_types=1);

namespace App\Modules\Audit\Observers;

use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent lifecycle observer that fires audit hooks. Wired via the
 * `HasAuditTrail` trait — only models that opt-in are observed.
 *
 * Logs create/update/delete events to Spatie Activity Log (model diff).
 * Security-relevant events are written to the immutable audit_logs via
 * AuditLogService explicitly (NOT via this observer — those are conscious
 * choices, not passive diffs).
 */
final class AuditObserver
{
    public function created(Model $model): void
    {
        activity()
            ->causedBy(auth()->user())
            ->performedOn($model)
            ->event('created')
            ->log(class_basename($model).' created');
    }

    public function updated(Model $model): void
    {
        activity()
            ->causedBy(auth()->user())
            ->performedOn($model)
            ->event('updated')
            ->withProperties($model->getChanges())
            ->log(class_basename($model).' updated');
    }

    public function deleted(Model $model): void
    {
        activity()
            ->causedBy(auth()->user())
            ->performedOn($model)
            ->event('deleted')
            ->log(class_basename($model).' deleted');
    }
}