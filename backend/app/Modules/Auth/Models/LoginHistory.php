<?php

declare(strict_types=1);

namespace App\Modules\Auth\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Every login attempt — successful or not — is recorded for security review.
 * Includes device fingerprint and IP for alerting.
 */
final class LoginHistory extends Model
{
    protected $table = 'login_history';

    /** @var array<int, string> */
    protected $fillable = [
        'user_id', 'ip_address', 'user_agent', 'device_id',
        'status', 'mfa_used', 'lat', 'lon', 'attempted_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'mfa_used'     => 'boolean',
        'attempted_at' => 'datetime',
        'lat'          => 'float',
        'lon'          => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Status values */
    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED_PASSWORD = 'failed_password';
    public const STATUS_FAILED_MFA = 'failed_mfa';
    public const STATUS_LOCKED = 'locked';
}