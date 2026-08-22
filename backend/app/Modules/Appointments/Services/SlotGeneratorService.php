<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Models\DoctorSchedule;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SlotGeneratorService
{
    /**
     * Generates a list of available/full slots for a specific doctor, date, and branch.
     * Implements the algorithm from spec §6.1.
     *
     * @return array<int, array{start_time: string, end_time: string, status: string}>
     */
    public function getAvailableSlots(int $doctorId, Carbon $date, int $branchId, ?string $scheduleId = null): array
    {
        // 1. Fetch active schedule
        $schedule = DoctorSchedule::with(['timeBlocks', 'overrides' => function ($q) use ($date) {
            $q->where('override_date', $date->toDateString());
        }])
        ->where('doctor_id', $doctorId)
        ->where('branch_id', $branchId)
        ->when($scheduleId !== null, fn ($query) => $query->whereKey($scheduleId))
        ->where('is_active', true)
        ->where('valid_from', '<=', $date->toDateString())
        ->where(function ($q) use ($date) {
            $q->whereNull('valid_until')
              ->orWhere('valid_until', '>=', $date->toDateString());
        })
        ->first();

        if (!$schedule) {
            return []; // No active schedule
        }

        $overrides = $schedule->overrides;
        
        // Check for full-day unavailability
        $fullDayBlocked = $overrides->where('type', 'unavailable')->whereNull('start_time')->first();
        if ($fullDayBlocked) {
            return [];
        }

        // 2. Base time blocks for the day of week (0=Sun, 1=Mon... match Carbon dayOfWeek)
        // Carbon dayOfWeek returns 0 (Sun) - 6 (Sat)
        $blocks = collect($schedule->timeBlocks->where('day_of_week', $date->dayOfWeek));

        // 3. Apply extra time blocks from overrides
        $extraBlocks = $overrides->where('type', 'extra')->whereNotNull('start_time');
        foreach ($extraBlocks as $extra) {
            $blocks->push((object)[
                'start_time' => $extra->start_time,
                'end_time' => $extra->end_time,
            ]);
        }

        // Partial day unavailable overrides
        $blockedRanges = $overrides->where('type', 'unavailable')->whereNotNull('start_time');

        // 4. Generate all possible slots
        $slots = new Collection();
        $slotDuration = $schedule->slot_duration;

        foreach ($blocks as $block) {
            $current = Carbon::parse($date->toDateString() . ' ' . $block->start_time);
            $blockEnd = Carbon::parse($date->toDateString() . ' ' . $block->end_time);

            while ($current->copy()->addMinutes($slotDuration)->lte($blockEnd)) {
                $slotStart = $current->copy();
                $slotEnd = $current->copy()->addMinutes($slotDuration);
                
                $current->addMinutes($slotDuration);

                // Is this slot inside a blocked range?
                $isBlocked = $blockedRanges->contains(function ($override) use ($slotStart, $slotEnd, $date) {
                    $overrideStart = Carbon::parse($date->toDateString() . ' ' . $override->start_time);
                    $overrideEnd = Carbon::parse($date->toDateString() . ' ' . $override->end_time);
                    // Overlaps if slot start is < override end AND slot end is > override start
                    return $slotStart->lt($overrideEnd) && $slotEnd->gt($overrideStart);
                });

                if (!$isBlocked) {
                    $slots->push([
                        'start_time' => $slotStart->format('H:i:s'),
                        'end_time' => $slotEnd->format('H:i:s'),
                        'status' => 'available',
                    ]);
                }
            }
        }

        if ($slots->isEmpty()) {
            return [];
        }

        // 5. Fetch existing appointments
        $minStart = $slots->min('start_time');
        $maxEnd = $slots->max('end_time');

        $appointments = Appointment::where('doctor_id', $doctorId)
            ->where('appointment_date', $date->toDateString())
            ->whereNotIn('status', ['cancelled', 'rescheduled', 'no_show'])
            ->get();

        // 6. Check max_concurrent per slot
        $maxConcurrent = $schedule->max_concurrent;

        return $slots->map(function ($slot) use ($appointments, $maxConcurrent) {
            $slotStart = $slot['start_time'];
            $slotEnd = $slot['end_time'];

            $bookedCount = $appointments->filter(function ($apt) use ($slotStart, $slotEnd) {
                // Overlaps if apt start < slot end AND apt end > slot start
                return $apt->start_time < $slotEnd && $apt->end_time > $slotStart;
            })->count();

            $slot['status'] = $bookedCount >= $maxConcurrent ? 'full' : 'available';
            
            return $slot;
        })->toArray();
    }
}
