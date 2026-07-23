<?php

declare(strict_types=1);

namespace App\Modules\Laboratory\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A lab test ordered for a specific patient encounter/visit.
 *
 * @property int         $id
 * @property string      $public_id
 * @property int         $branch_id
 * @property int         $visit_id
 * @property int         $patient_id
 * @property int         $ordered_by      User (doctor) who placed the order
 * @property int         $lab_test_id
 * @property string      $status          pending|collected|processing|resulted|cancelled
 * @property string|null $priority        routine|urgent|stat
 * @property string|null $clinical_notes  Clinical notes from requesting doctor
 * @property string|null $specimen_type   blood|urine|stool|swab|other
 * @property \Illuminate\Support\Carbon|null $collected_at
 * @property \Illuminate\Support\Carbon|null $resulted_at
 */
final class LabOrder extends Model
{
    use SoftDeletes;

    protected $table = 'lab_orders';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id', 'branch_id', 'visit_id', 'patient_id', 'ordered_by',
        'lab_test_id', 'status', 'priority', 'clinical_notes',
        'specimen_type', 'collected_at', 'resulted_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'collected_at' => 'datetime',
        'resulted_at'  => 'datetime',
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

    public function test(): BelongsTo
    {
        return $this->belongsTo(LabTest::class, 'lab_test_id');
    }

    public function result(): HasOne
    {
        return $this->hasOne(LabResult::class, 'lab_order_id');
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
