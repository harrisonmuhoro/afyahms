<?php

declare(strict_types=1);

namespace App\Modules\Radiology\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * An imaging request placed for a patient visit.
 *
 * Status workflow: pending → scheduled → acquired → reported → cancelled
 *
 * @property int         $id
 * @property string      $public_id
 * @property int         $branch_id
 * @property int         $visit_id
 * @property int         $patient_id
 * @property int         $ordered_by          Requesting doctor User ID
 * @property int         $imaging_study_id
 * @property string      $status              pending|scheduled|acquired|reported|cancelled
 * @property string      $priority            routine|urgent|stat
 * @property string|null $clinical_indication Clinical reason / history
 * @property bool        $contrast_used
 * @property string|null $contrast_agent
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $scheduled_at
 * @property \Illuminate\Support\Carbon|null $acquired_at
 * @property \Illuminate\Support\Carbon|null $reported_at
 */
final class ImagingOrder extends Model
{
    use SoftDeletes;

    protected $table = 'imaging_orders';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'visit_id', 'patient_id', 'ordered_by',
        'imaging_study_id', 'status', 'priority', 'clinical_indication',
        'contrast_used', 'contrast_agent', 'notes',
        'scheduled_at', 'acquired_at', 'reported_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'contrast_used' => 'boolean',
        'scheduled_at'  => 'datetime',
        'acquired_at'   => 'datetime',
        'reported_at'   => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $order): void {
            if (empty($order->public_id)) {
                $order->public_id = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function study(): BelongsTo
    {
        return $this->belongsTo(ImagingStudy::class, 'imaging_study_id');
    }

    public function report(): HasOne
    {
        return $this->hasOne(ImagingReport::class, 'imaging_order_id');
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Queue\Models\Visit::class, 'visit_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Patients\Models\Patient::class, 'patient_id');
    }

    public function orderedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'ordered_by');
    }
}
