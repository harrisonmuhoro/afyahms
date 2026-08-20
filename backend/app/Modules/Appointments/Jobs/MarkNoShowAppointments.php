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
        // Find appointments that are scheduled/confirmed, 
        // past their end_time for today, and not checked-in.
        $now = now();
        $date = $now->toDateString();
        $time = $now->toTimeString();

        $appointments = Appointment::whereIn('status', [
            AppointmentStatus::Scheduled->value,
            AppointmentStatus::Confirmed->value,
        ])
        ->where('appointment_date', '<=', $date)
        ->where(function ($query) use ($date, $time) {
            $query->where('appointment_date', '<', $date)
                  ->orWhere(function ($q) use ($time) {
                      $q->where('end_time', '<', $time);
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
