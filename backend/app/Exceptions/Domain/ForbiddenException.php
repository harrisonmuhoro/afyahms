<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class ForbiddenException extends DomainException
{
    protected const DEFAULT_MESSAGE = 'Forbidden.';

    public function __construct(string $message = '', array $context = [], ?\Throwable $previous = null)
    {
        parent::__construct($message ?: static::DEFAULT_MESSAGE, 403, $context, $previous);
    }
}