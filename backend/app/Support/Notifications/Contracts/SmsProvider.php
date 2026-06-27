<?php

declare(strict_types=1);

namespace App\Support\Notifications\Contracts;

interface SmsProvider
{
    /**
     * Send an SMS message.
     *
     * @return array{status: string, message_id: ?string, raw: array}
     */
    public function send(string $toE164, string $message): array;
}