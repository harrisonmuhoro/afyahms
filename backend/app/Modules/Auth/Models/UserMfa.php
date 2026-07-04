<?php

declare(strict_types=1);

namespace App\Modules\Auth\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A TOTP secret + recovery codes for a user who enabled MFA.
 *
 * Encrypted at rest (Laravel encrypted cast). Recovery codes are hashed.
 */
final class UserMfa extends Model
{
    protected $table = 'user_mfa';

    protected $fillable = [
        'user_id', 'type', 'secret', 'recovery_codes', 'enabled_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'secret'         => 'encrypted',
        'recovery_codes' => 'encrypted:array',
        'enabled_at'     => 'datetime',
    ];

    /** @var array<int, string> */
    protected $hidden = ['secret', 'recovery_codes'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}