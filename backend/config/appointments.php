<?php

declare(strict_types=1);

return [
    'patient_cancellation_window_hours' => (int) env('APPOINTMENT_PATIENT_CANCELLATION_HOURS', 2),
    'consultation_fees' => json_decode((string) env('APPOINTMENT_CONSULTATION_FEES', '{}'), true) ?: [],
];
