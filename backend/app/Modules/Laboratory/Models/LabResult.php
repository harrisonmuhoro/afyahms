<?php

declare(strict_types=1);

namespace App\Modules\Laboratory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The result record produced when a lab order is completed.
 *
 * @property int         $id
 * @property int         $lab_order_id
 * @property int         $reported_by     Lab technician user ID
 * @property string      $findings        Free-text or structured findings
 * @property string|null $interpretation  normal|abnormal|critical
 * @property string|null $reference_range Normal range text
 * @property string|null $unit
 * @property string|null $value           Numeric or string result value
 * @property bool        $is_critical     True if value falls in critical/panic range
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $verified_at
 * @property int|null    $verified_by
 */
final class LabResult extends Model
{
    use SoftDeletes;

    protected $table = 'lab_results';

    /** @var array<int, string> */
    protected $fillable = [
        'lab_order_id', 'reported_by', 'findings', 'interpretation',
        'reference_range', 'unit', 'value', 'is_critical',
        'notes', 'verified_at', 'verified_by',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_critical' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id');
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'reported_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'verified_by');
    }
}
