<?php

declare(strict_types=1);

namespace Tests\Unit\Support\Sequences;

use App\Support\Sequences\SequenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Foundation §6: SequenceService is the SOLE writer of the sequences table.
 * Must be concurrency-safe via SELECT ... FOR UPDATE.
 */
final class SequenceServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_next_returns_padded_identifier(): void
    {
        /** @var SequenceService $svc */
        $svc = app(SequenceService::class);

        $first = $svc->next('patient:2026', 'PAT-2026');
        $second = $svc->next('patient:2026', 'PAT-2026');

        $this->assertSame('PAT-2026-000001', $first);
        $this->assertSame('PAT-2026-000002', $second);
    }

    public function test_next_handles_branch_scoped_invoice_sequence(): void
    {
        /** @var SequenceService $svc */
        $svc = app(SequenceService::class);

        $a = $svc->next('invoice:NRB:2026', 'INV-NRB-2026');
        $b = $svc->next('invoice:KSM:2026', 'INV-KSM-2026');
        $c = $svc->next('invoice:NRB:2026', 'INV-NRB-2026');

        $this->assertSame('INV-NRB-2026-000001', $a);
        $this->assertSame('INV-KSM-2026-000001', $b);
        $this->assertSame('INV-NRB-2026-000002', $c);
    }

    public function test_current_returns_zero_for_never_allocated_scope(): void
    {
        /** @var SequenceService $svc */
        $svc = app(SequenceService::class);
        $this->assertSame(0, $svc->current('not-yet-allocated:2026'));
    }
}