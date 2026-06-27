<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class NotFoundException extends DomainException
{
    protected const DEFAULT_MESSAGE = 'Resource not found.';
}