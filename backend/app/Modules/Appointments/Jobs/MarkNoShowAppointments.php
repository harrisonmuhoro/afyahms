<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Jobs;

use App\Modules\Appointments\Enums\AppointmentStatus;
use App\Modules\Appointments\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class MarkNoShowAppointments implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Executes the job to mark late appointments as no-show (spec §3.5).
     */
    public function handle(): void
    {
        // Find appointments that are scheduled/confirmed and at least 30 minutes
        // past their end time. The grace period prevents premature no-shows.
        $now = now();
        $cutoff = $now->copy()->subMinutes(30);

        $appointments = Appointment::withoutGlobalScopes()->whereIn('status', [
            AppointmentStatus::Scheduled->value,
            AppointmentStatus::Confirmed->value,
        ])
        ->where(function ($query) use ($cutoff) {
            $query->whereDate('appointment_date', '<', $cutoff->toDateString())
                ->orWhere(function ($sameDay) use ($cutoff) {
                    $sameDay->whereDate('appointment_date', $cutoff->toDateString())
                        ->where('end_time', '<=', $cutoff->toTimeString());
                });
        })
        ->get();

        $count = 0;
        foreach ($appointments as $appointment) {
            $appointment->update([
                'status' => AppointmentStatus::NoShow,
            ]);
            $count++;
        }

        if ($count > 0) {
            Log::info("MarkNoShowAppointments: Marked {$count} appointments as no-show.");
        }
    }
}
