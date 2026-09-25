<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A physical branch location (e.g. NRB = Nairobi HQ, KSM = Kisumu).
 *
 * Branch records are GLOBAL — they are NOT branch-scoped themselves.
 */
class Branch extends Model
{
    use HasFactory;
    use LogsActivity;
    use SoftDeletes;

    protected $table = 'branches';

    /** @var array<int, string> */
    protected $fillable = [
        'code', 'name', 'address', 'phone', 'email',
        'timezone', 'currency', 'is_active',
        'mpesa_shortcode', 'sha_facility_code',
        'appointment_cancellation_window_hours',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_active' => 'boolean',
        'appointment_cancellation_window_hours' => 'integer',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['code', 'name', 'address', 'is_active', 'mpesa_shortcode', 'sha_facility_code'])
            ->logOnlyDirty();
    }

    public static function findByCode(string $code): ?self
    {
        return static::query()->where('code', $code)->first();
    }

    protected static function booted(): void
    {
        static::creating(function (self $branch): void {
            if (empty($branch->public_id)) {
                $branch->public_id = (string) Str::uuid();
            }
        });
    }
}
