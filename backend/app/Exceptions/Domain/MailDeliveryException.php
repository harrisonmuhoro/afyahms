<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class MailDeliveryException extends DomainException
{
    protected const DEFAULT_MESSAGE = 'The verification email could not be delivered. Please try again later.';

    public function __construct(string $message = '', ?\Throwable $previous = null)
    {
        parent::__construct($message ?: static::DEFAULT_MESSAGE, 503, [], $previous);
    }
}
