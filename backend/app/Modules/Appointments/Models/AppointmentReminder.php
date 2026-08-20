<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentReminder extends Model
{
    use HasFactory;
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'appointment_id',
        'channel',
        'type',
        'scheduled_at',
        'sent_at',
        'status',
        'error_message',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
