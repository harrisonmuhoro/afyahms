<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Modules\Appointments\Models\Appointment;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class AppointmentNumberService
{
    /**
     * Generates a unique appointment number: APT-{YYYY}-{NNNNN}.
     * Example: APT-2026-00142
     *
     * Uses row-level locking on the most recent record for the branch
     * to prevent race conditions from generating duplicates.
     */
    public function generate(string $branchId): string
    {
        $year = now()->year;

        // Get the highest number for this branch this year
        // Use lockForUpdate to ensure atomic generation
        $lastNumber = Appointment::where('branch_id', $branchId)
            ->whereYear('created_at', $year)
            ->lockForUpdate()
            ->max(DB::raw("CAST(SUBSTRING_INDEX(appointment_number, '-', -1) AS UNSIGNED)"));

        $nextSequence = ($lastNumber ?? 0) + 1;
        $paddedSequence = str_pad((string) $nextSequence, 5, '0', STR_PAD_LEFT);

        return "APT-{$year}-{$paddedSequence}";
    }
}
