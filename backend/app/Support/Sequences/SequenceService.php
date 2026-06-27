<?php

declare(strict_types=1);

namespace App\Support\Sequences;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\DatabaseManager;
use RuntimeException;

/**
 * SOLE writer of the `sequences` table.
 *
 * Foundation §6:
 *   "A SequenceService is the only writer."
 *
 * Allocates gap-tolerant identifiers using SELECT ... FOR UPDATE inside
 * a DB transaction. Idempotent under concurrency, no duplicate sequence
 * numbers ever.
 *
 * Usage:
 *   $patientNumber = app(SequenceService::class)->next('patient', 2026);
 *   // returns: 'PAT-2026-000042'
 *
 *   $invoice = app(SequenceService::class)->next(
 *       scope: 'invoice:NRB:2026',
 *       prefix: 'INV-NRB-2026',
 *       digits: 6,
 *   );
 *   // returns: 'INV-NRB-2026-001934'
 */
final class SequenceService
{
    public function __construct(private readonly DatabaseManager $db) {}

    /**
     * Allocate the next sequence number.
     *
     * @param  string  $scope    Logical scope: 'patient:2026', 'invoice:NRB:2026', etc.
     * @param  string  $prefix   Display prefix: 'PAT-2026', 'INV-NRB-2026', 'RX-NRB-2026'
     * @param  int     $digits   Zero-padding digit count
     */
    public function next(string $scope, string $prefix, int $digits = 6): string
    {
        $value = $this->db->transaction(function () use ($scope): int {
            $table = config('sequences.table', 'sequences');

            $row = $this->db->table($table)
                ->where('scope', $scope)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                $this->db->table($table)->insert([
                    'scope'  => $scope,
                    'value'  => 1,
                ]);
                $next = 1;
            } else {
                $next = $row->value + 1;
                $this->db->table($table)
                    ->where('scope', $scope)
                    ->update([
                        'value'      => $next,
                        'updated_at' => now(),
                    ]);
            }

            if ((bool) config('sequences.audit', true)) {
                $this->db->table('audit_logs')->insert([
                    'event'       => 'sequence.allocated',
                    'subject_type'=> 'sequence',
                    'subject_id'  => 0,
                    'causer_id'   => auth()->id(),
                    'properties'  => json_encode(['scope' => $scope, 'value' => $next]),
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }

            return $next;
        });

        return sprintf('%s-%0'.$digits.'d', $prefix, $value);
    }

    /**
     * Read the current sequence value without allocating a new one.
     */
    public function current(string $scope): int
    {
        $table = config('sequences.table', 'sequences');
        $row = $this->db->table($table)->where('scope', $scope)->first();

        return $row?->value ?? 0;
    }
}