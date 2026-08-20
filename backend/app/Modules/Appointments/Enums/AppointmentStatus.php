<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Enums;

/**
 * All valid statuses for an Appointment.
 *
 * Status flow (spec §3.5):
 *   scheduled → confirmed → checked_in → in_progress → completed
 *                                                     ↘ no_show
 *               ↘ cancelled
 *               ↘ rescheduled → [new appointment]
 */
enum AppointmentStatus: string
{
    case Scheduled   = 'scheduled';
    case Confirmed   = 'confirmed';
    case Cancelled   = 'cancelled';
    case Rescheduled = 'rescheduled';
    case CheckedIn   = 'checked_in';
    case InProgress  = 'in_progress';
    case Completed   = 'completed';
    case NoShow      = 'no_show';

    /** Human-readable label for UI display. */
    public function label(): string
    {
        return match($this) {
            self::Scheduled   => 'Scheduled',
            self::Confirmed   => 'Confirmed',
            self::Cancelled   => 'Cancelled',
            self::Rescheduled => 'Rescheduled',
            self::CheckedIn   => 'Checked In',
            self::InProgress  => 'In Progress',
            self::Completed   => 'Completed',
            self::NoShow      => 'No-show',
        };
    }

    /** Returns true if this status is considered "active" (occupies a slot). */
    public function occupiesSlot(): bool
    {
        return in_array($this, [
            self::Scheduled,
            self::Confirmed,
            self::CheckedIn,
            self::InProgress,
        ], true);
    }

    /** Statuses that count as "terminal" (cannot be further updated). */
    public function isTerminal(): bool
    {
        return in_array($this, [
            self::Completed,
            self::Cancelled,
            self::NoShow,
        ], true);
    }
}
