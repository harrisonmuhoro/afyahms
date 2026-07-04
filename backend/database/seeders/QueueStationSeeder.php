<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Queue\Models\QueueStation;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Seeder;

/**
 * Seeds the canonical 7-station pipeline for every branch.
 *
 * Codes / order match QueueService::PIPELINE_ORDER:
 *   REC → TRI → DOC → RAD → LAB → PHA → BIL
 *
 * Idempotent: keyed on (branch_id, code) via updateOrCreate.
 */
final class QueueStationSeeder extends Seeder
{
    /** @var list<array{code:string,name:string,station_type:string,pipeline_order:int}> */
    private const STATIONS = [
        ['code' => 'REC', 'name' => 'Reception',  'station_type' => 'reception',  'pipeline_order' => 1],
        ['code' => 'TRI', 'name' => 'Triage',     'station_type' => 'triage',     'pipeline_order' => 2],
        ['code' => 'DOC', 'name' => 'Doctor',     'station_type' => 'doctor',     'pipeline_order' => 3],
        ['code' => 'RAD', 'name' => 'Radiology',  'station_type' => 'radiology',  'pipeline_order' => 4],
        ['code' => 'LAB', 'name' => 'Laboratory', 'station_type' => 'laboratory', 'pipeline_order' => 5],
        ['code' => 'PHA', 'name' => 'Pharmacy',   'station_type' => 'pharmacy',   'pipeline_order' => 6],
        ['code' => 'BIL', 'name' => 'Billing',    'station_type' => 'billing',    'pipeline_order' => 7],
    ];

    public function run(): void
    {
        Branch::query()->each(function (Branch $branch): void {
            foreach (self::STATIONS as $station) {
                QueueStation::query()
                    ->withoutGlobalScope(BranchScope::class)
                    ->updateOrCreate(
                    ['branch_id' => $branch->id, 'code' => $station['code']],
                    [
                        'name'           => $station['name'],
                        'station_type'   => $station['station_type'],
                        'pipeline_order' => $station['pipeline_order'],
                        'is_active'      => true,
                        'status'         => 'open',
                    ],
                );
            }
        });
    }
}
