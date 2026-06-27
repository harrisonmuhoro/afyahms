<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class ConflictException extends DomainException
{
    protected const DEFAULT_MESSAGE = 'Conflict with current state.';
}