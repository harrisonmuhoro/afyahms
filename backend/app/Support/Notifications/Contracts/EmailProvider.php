<?php

declare(strict_types=1);

namespace App\Support\Notifications\Contracts;

interface EmailProvider
{
    /**
     * Send a transactional email.
     *
     * @param  array<string, mixed>  $data  Subject + html/text body + headers
     * @return array{status: string, message_id: ?string, raw: array}
     */
    public function send(string $toAddress, array $data): array;
}