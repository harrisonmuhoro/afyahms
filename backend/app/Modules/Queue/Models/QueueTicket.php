<?php

declare(strict_types=1);

namespace App\Modules\Queue\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int    $id
 * @property string $public_id
 * @property int    $branch_id
 * @property int    $visit_id
 * @property int    $station_id
 * @property int    $patient_id
 * @property string $ticket_number        e.g. 'TRI-014'
 * @property int    $sequence_value
 * @property string $ticket_date          YYYY-MM-DD
 * @property string $priority             normal|priority|emergency
 * @property string|null $mts_category    red|orange|yellow|green|blue
 * @property string $state                issued|waiting|called|in_service|held|completed|no_show|transferred|cancelled
 * @property string $station_code         denormalized via with('station') for sort
 */
class QueueTicket extends Model
{
    protected $table = 'queue_tickets';

    protected $fillable = [
        'public_id', 'branch_id', 'visit_id', 'station_id', 'patient_id',
        'encounter_id', 'appointment_id',
        'ticket_number', 'sequence_value', 'ticket_date',
        'priority', 'mts_category', 'state',
        'served_by', 'called_at', 'served_at', 'completed_at',
    ];

    protected $casts = [
        'ticket_date'    => 'date',
        'sequence_value' => 'integer',
        'called_at'      => 'datetime',
        'served_at'      => 'datetime',
        'completed_at'   => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(QueueStation::class, 'station_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Patients\Models\Patient::class, 'patient_id');
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Queue\Models\Visit::class, 'visit_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(QueueEvent::class, 'queue_ticket_id')->orderBy('occurred_at');
    }
}
