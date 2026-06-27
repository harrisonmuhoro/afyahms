<?php

declare(strict_types=1);

namespace App\Support\Insurance\Gateways;

final class ClaimSubmissionResult
{
    public function __construct(
        public readonly bool $accepted,
        public readonly string $claimNumber,
        public readonly ?string $insurerReference = null,
        /** @var array<string, mixed> */
        public readonly array $raw = [],
    ) {}
}