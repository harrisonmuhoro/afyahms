<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Base class for all domain exceptions raised from the Service layer.
 *
 * Carries an HTTP status code so the global exception renderer can map
 * domain failures to a meaningful API response without the service
 * layer having to know about HTTP.
 */
abstract class DomainException extends RuntimeException implements HttpExceptionInterface
{
    /** @var array<string, mixed> */
    protected array $context = [];

    public function __construct(
        string $message,
        protected int $statusCode = 422,
        /** @var array<string, mixed> */
        array $context = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
        $this->context = $context;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /** @return array<string, mixed> */
    public function getHeaders(): array
    {
        return [];
    }

    /** @return array<string, mixed> */
    public function context(): array
    {
        return $this->context;
    }

    public static function make(string $message = '', int $statusCode = 422, array $context = []): static
    {
        return new static($message ?: static::DEFAULT_MESSAGE, $statusCode, $context);
    }

    protected const DEFAULT_MESSAGE = 'Domain rule violation.';
}