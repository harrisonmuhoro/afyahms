<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class ValidationFailedException extends DomainException
{
    protected const DEFAULT_MESSAGE = 'Validation failed.';

    public function __construct(string $message = '', array $context = [], ?\Throwable $previous = null)
    {
        parent::__construct($message ?: static::DEFAULT_MESSAGE, 422, $context, $previous);
    }
}