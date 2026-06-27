<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Queue\Models\QueueStation;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Console\Command;

/**
 * Seed the canonical queue stations for every active branch:
 *   REC (Reception) → TRI (Triage) → DOC (Doctor) → LAB → RAD → PHA (Pharmacy) → BIL (Billing).
 *
 * Idempotent: re-running adds nothing if stations already exist for a branch.
 */
final class SeedQueueStations extends Command
{
    protected $signature = 'queue:seed-stations';
    protected $description = 'Seed canonical queue stations (REC/TRI/DOC/LAB/RAD/PHA/BIL) per branch.';

    /** @var array<int, array{code: string, name: string, type: string, order: int}> */
    private const STATIONS = [
        ['code' => 'REC',  'name' => 'Reception',  'type' => 'reception', 'order' => 1],
        ['code' => 'TRI',  'name' => 'Triage',     'type' => 'triage',    'order' => 2],
        ['code' => 'DOC',  'name' => 'Doctor',     'type' => 'doctor',    'order' => 3],
        ['code' => 'LAB',  'name' => 'Laboratory', 'type' => 'laboratory', 'order' => 4],
        ['code' => 'RAD',  'name' => 'Radiology',  'type' => 'radiology', 'order' => 5],
        ['code' => 'PHA',  'name' => 'Pharmacy',   'type' => 'pharmacy',  'order' => 6],
        ['code' => 'BIL',  'name' => 'Billing',    'type' => 'billing',   'order' => 7],
    ];

    public function handle(): int
    {
        $created = 0;
        $skipped = 0;

        // In CLI, no middleware sets the container binding — disable BranchScope globally.
        \App\Modules\Tenancy\Scopes\BranchScope::disable();

        try {
            foreach (Branch::query()->where('is_active', true)->cursor() as $branch) {
                foreach (self::STATIONS as $station) {
                    $exists = QueueStation::query()
                        ->where('branch_id', $branch->id)
                        ->where('code', $station['code'])
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    QueueStation::query()->create([
                        'branch_id'      => $branch->id,
                        'code'           => $station['code'],
                        'name'           => $station['name'],
                        'station_type'   => $station['type'],
                        'pipeline_order' => $station['order'],
                        'is_active'      => true,
                        'status'         => 'open',
                    ]);
                    $created++;
                }
            }
        } finally {
            \App\Modules\Tenancy\Scopes\BranchScope::enableFor(null);
        }

        $this->info("Stations created: {$created}, skipped: {$skipped}.");

        return self::SUCCESS;
    }
}
