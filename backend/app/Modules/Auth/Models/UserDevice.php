<?php

declare(strict_types=1);

namespace App\Modules\Auth\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDevice extends Model
{
    protected $table = 'user_devices';

    /** @var array<int, string> */
    protected $fillable = [
        'user_id', 'device_fingerprint', 'name', 'platform', 'browser',
        'ip_address', 'last_seen_at', 'trusted_until',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'last_seen_at'  => 'datetime',
        'trusted_until' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}