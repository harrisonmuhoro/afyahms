<?php

declare(strict_types=1);

namespace App\Modules\Radiology\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Radiologist's written report for a completed imaging order.
 *
 * @property int         $id
 * @property int         $imaging_order_id
 * @property int         $reported_by          Radiologist user ID
 * @property string      $technique            Description of acquisition technique
 * @property string      $findings             Detailed findings
 * @property string      $impression           Summary / clinical conclusion
 * @property string|null $recommendations
 * @property string      $status               draft|final|amended
 * @property bool        $is_critical          True if urgent/critical findings
 * @property string|null $critical_notes       If is_critical, elaboration
 * @property \Illuminate\Support\Carbon|null $finalized_at
 * @property int|null    $verified_by
 * @property \Illuminate\Support\Carbon|null $verified_at
 */
final class ImagingReport extends Model
{
    use SoftDeletes;

    protected $table = 'imaging_reports';

    /** @var array<int, string> */
    protected $fillable = [
        'imaging_order_id', 'reported_by', 'technique', 'findings',
        'impression', 'recommendations', 'status', 'is_critical',
        'critical_notes', 'finalized_at', 'verified_by', 'verified_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_critical'  => 'boolean',
        'finalized_at' => 'datetime',
        'verified_at'  => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(ImagingOrder::class, 'imaging_order_id');
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
