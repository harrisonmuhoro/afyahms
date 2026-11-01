<?php

declare(strict_types=1);

namespace App\Modules\Emr\Models;

use App\Models\User;
use App\Modules\Patients\Models\Patient;
use App\Models\Medication;
use App\Models\Prescription;
use App\Modules\Queue\Models\Visit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmarRecord extends Model
{
    protected $table = 'emar_records';

    protected $fillable = [
        'visit_id',
        'patient_id',
        'medication_id',
        'prescription_id',
        'dose',
        'route',
        'frequency',
        'scheduled_time',
        'administered_time',
        'administered_by',
        'status',
        'notes',
    ];

    protected $casts = [
        'scheduled_time' => 'datetime',
        'administered_time' => 'datetime',
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class);
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function administeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administered_by');
    }
}
