<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Services;

use App\Support\Sequences\SequenceService;

class AppointmentNumberService
{
    public function __construct(private readonly SequenceService $sequences) {}

    /**
     * Generates a unique appointment number: APT-{YYYY}-{NNNNN}.
     * Example: APT-2026-00142
     *
     * Allocates through the shared row-locked sequence table.
     */
    public function generate(string $branchId): string
    {
        $year = now()->year;

        return $this->sequences->next(
            scope: "appointment:{$branchId}:{$year}",
            prefix: "APT-{$year}",
            digits: 5,
        );
    }
}
