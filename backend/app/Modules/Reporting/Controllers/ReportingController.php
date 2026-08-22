<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

final class ReportingController extends Controller
{
    public function getDashboardStats(Request $request): JsonResponse
    {
        $branchId = $this->getEffectiveBranchId($request);

        $revenueToday = \App\Modules\Billing\Models\Bill::query()
            ->whereDate('created_at', today())
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->sum('paid_amount');

        $outstandingInvoices = \App\Modules\Billing\Models\Bill::query()
            ->whereIn('status', ['pending', 'partial'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->count();

        $shaClaimsPending = \App\Modules\Billing\Models\Bill::query()
            ->where('payment_method', 'insurance')
            ->where('status', 'pending')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->count();

        $patientsSeen = \App\Modules\Queue\Models\Visit::query()
            ->whereDate('visit_date', today())
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->count();

        return response()->json([
            'financial' => [
                'revenue_today'        => $revenueToday,
                'outstanding_invoices' => $outstandingInvoices,
                'sha_claims_pending'   => $shaClaimsPending,
            ],
            'clinical' => [
                'patients_seen_today' => $patientsSeen,
            ],
        ]);
    }

    /**
     * Get the effective branch_id for filtering.
     * Non-superadmin users are always scoped to their own active branch.
     * Superadmins can supply any branch_id or 'all'.
     */
    private function getEffectiveBranchId(Request $request): ?int
    {
        $user = $request->user();
        if ($user === null) {
            return null;
        }

        // Non-superadmins are always scoped to their active branch.
        if (! $user->hasRole('superadmin')) {
            return $user->current_branch_id;
        }

        // Superadmins can pick a branch via query param; omit to see all.
        $branchId = $request->query('branch_id');
        if ($branchId && $branchId !== 'all') {
            return (int) $branchId;
        }

        return null;
    }

    /**
     * Apply branch scoping to a query builder.
     */
    private function applyBranchScope(Builder $query, ?int $branchId): Builder
    {
        return $query->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId));
    }

    public function getReportData(\App\Http\Requests\ReportFilterRequest $request, string $type): JsonResponse
    {
        // ...
        if ($type === 'revenue-summary') return $this->getRevenueSummary($request);
        if ($type === 'payments-collected') return $this->getPaymentsCollected($request);
        if ($type === 'outstanding-invoices') return $this->getOutstandingInvoices($request);
        if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);
        if ($type === 'prescriptions-issued') return $this->getPrescriptionsIssued($request);
        if ($type === 'lab-results') return $this->getLabResults($request);
        if ($type === 'queue-throughput') return $this->getQueueThroughput($request);
        if ($type === 'wait-times') return $this->getWaitTimes($request);
        if ($type === 'patient-volume') return $this->getPatientVolume($request);
        if ($type === 'appointment-statistics') return $this->getAppointmentStatistics($request);
        if ($type === 'stock-levels') return $this->getStockLevels($request);
        if ($type === 'expiring-items') return $this->getExpiringItems($request);
        if ($type === 'stock-consumption') return $this->getStockConsumption($request);

        return response()->json([
            'report_type' => $type,
            'message' => 'Unknown report type.',
            'data' => []
        ], 404);
    }

    private function getRevenueSummary(\App\Http\Requests\ReportFilterRequest $request)
    {
        $validated = $request->validated();
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        
        $query = \App\Modules\Billing\Models\Bill::query();

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $branchId = $this->getEffectiveBranchId($request);
        $this->applyBranchScope($query, $branchId);

        // SQL Aggregations for KPIs
        $totalRevenue = (float) (clone $query)->sum('paid_amount');
        $completedCount = (int) (clone $query)->whereIn('status', ['cleared', 'waived'])->count();
        $pendingCount = (int) (clone $query)->whereIn('status', ['pending', 'partial'])->count();

        // SQL Aggregations for Chart
        $chartData = (clone $query)
            ->selectRaw('DATE(created_at) as date, SUM(paid_amount) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();

        // Limited Table Data (preventing mass memory consumption)
        $bills = (clone $query)->with('patient')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $tableData = $bills->map(function($bill) {
            return [
                'public_id' => $bill->public_id,
                'date' => $bill->created_at ? $bill->created_at->format('Y-m-d H:i:s') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'status' => $bill->status,
                'total_amount' => $bill->total_amount,
                'paid_amount' => $bill->paid_amount,
            ];
        })->toArray();

        return response()->json([
            'kpis' => [
                'total_revenue' => $totalRevenue,
                'completed_count' => $completedCount,
                'pending_count' => $pendingCount,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getPaymentsCollected(\App\Http\Requests\ReportFilterRequest $request)
    {
        $validated = $request->validated();
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        
        $query = \App\Modules\Billing\Models\Bill::query()->where('paid_amount', '>', 0);

        if ($from) $query->whereDate('updated_at', '>=', $from);
        if ($to) $query->whereDate('updated_at', '<=', $to);

        $branchId = $this->getEffectiveBranchId($request);
        $this->applyBranchScope($query, $branchId);

        // SQL Aggregations for KPIs
        $totalCollected = (float) (clone $query)->sum('paid_amount');
        $cashPayments = (float) (clone $query)->where('payment_method', 'cash')->sum('paid_amount');
        $mpesaPayments = (float) (clone $query)->where('payment_method', 'mpesa')->sum('paid_amount');
        $insurancePayments = (float) (clone $query)->where('payment_method', 'insurance')->sum('paid_amount');

        // SQL Aggregations for Chart
        $chartData = (clone $query)
            ->selectRaw("
                DATE(updated_at) as date,
                SUM(CASE WHEN payment_method = 'cash' THEN paid_amount ELSE 0 END) as Cash,
                SUM(CASE WHEN payment_method = 'mpesa' THEN paid_amount ELSE 0 END) as 'M-Pesa',
                SUM(CASE WHEN payment_method = 'insurance' THEN paid_amount ELSE 0 END) as Insurance
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();

        // Limited Table Data
        $bills = (clone $query)->with('patient')
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get();

        $tableData = $bills->map(function($bill) {
            return [
                'public_id' => $bill->public_id,
                'date' => $bill->updated_at ? $bill->updated_at->format('Y-m-d H:i:s') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'channel' => ucfirst($bill->payment_method ?? 'Cash'),
                'reference' => 'REF-' . substr(md5((string)$bill->id), 0, 8),
                'amount' => $bill->paid_amount,
            ];
        })->toArray();

        return response()->json([
            'kpis' => [
                'total_collected' => $totalCollected,
                'cash_payments' => $cashPayments,
                'mpesa_payments' => $mpesaPayments,
                'insurance_payments' => $insurancePayments,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getOutstandingInvoices(\App\Http\Requests\ReportFilterRequest $request)
    {
        $validated = $request->validated();
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        
        $query = \App\Modules\Billing\Models\Bill::query()->whereIn('status', ['pending', 'partial']);

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $branchId = $this->getEffectiveBranchId($request);
        $this->applyBranchScope($query, $branchId);

        // SQL Aggregations for KPIs
        $totalOutstanding = (float) (clone $query)->selectRaw('SUM(total_amount - paid_amount) as total')->value('total');
        $fullyUnpaid = (int) (clone $query)->where('paid_amount', 0)->count();
        $partiallyPaid = (int) (clone $query)->where('paid_amount', '>', 0)->count();
        
        $oldestUnpaid = (clone $query)->min('created_at');
        $oldestUnpaidDate = $oldestUnpaid ? (new \Carbon\Carbon($oldestUnpaid))->format('Y-m-d') : 'N/A';

        // Chart Data grouped by aging bucket using SQL
        $bucketsQuery = (clone $query)->selectRaw("
            SUM(CASE WHEN DATEDIFF(NOW(), created_at) <= 30 THEN total_amount - paid_amount ELSE 0 END) as '0-30 days',
            SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 31 AND 60 THEN total_amount - paid_amount ELSE 0 END) as '31-60 days',
            SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 61 AND 90 THEN total_amount - paid_amount ELSE 0 END) as '61-90 days',
            SUM(CASE WHEN DATEDIFF(NOW(), created_at) > 90 THEN total_amount - paid_amount ELSE 0 END) as '90+ days'
        ")->first();

        $chartData = [];
        if ($bucketsQuery) {
            foreach (['0-30 days', '31-60 days', '61-90 days', '90+ days'] as $bucket) {
                $chartData[] = [
                    'bucket' => $bucket,
                    'amount' => (float) $bucketsQuery->getAttribute($bucket)
                ];
            }
        }

        // Limited Table Data
        $now = \Carbon\Carbon::now();
        $bills = (clone $query)->with('patient')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $tableData = $bills->map(function($bill) use ($now) {
            return [
                'public_id' => $bill->public_id,
                'date' => $bill->created_at ? $bill->created_at->format('Y-m-d') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'service' => 'Hospital Services',
                'total_amount' => $bill->total_amount,
                'paid_amount' => $bill->paid_amount,
                'balance' => $bill->total_amount - $bill->paid_amount,
                'days_outstanding' => $now->diffInDays($bill->created_at),
                'status' => $bill->paid_amount > 0 ? 'Partially Paid' : 'Unpaid',
            ];
        })->toArray();

        return response()->json([
            'kpis' => [
                'total_outstanding' => $totalOutstanding,
                'fully_unpaid' => $fullyUnpaid,
                'partially_paid' => $partiallyPaid,
                'oldest_unpaid' => $oldestUnpaidDate,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getShaClaims(\App\Http\Requests\ReportFilterRequest $request)
    {
        $validated = $request->validated();
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        
        $query = \App\Modules\Billing\Models\Bill::query()->where('payment_method', 'insurance');

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $branchId = $this->getEffectiveBranchId($request);
        $this->applyBranchScope($query, $branchId);

        // SQL Aggregations for KPIs
        $submittedCount = (int) (clone $query)->count();
        $claimedAmount = (float) (clone $query)->sum('total_amount');
        $approvedCount = (int) (clone $query)->whereIn('status', ['cleared', 'waived'])->count();
        $pendingCount = (int) (clone $query)->where('status', 'pending')->count();
        $rejectedCount = 0; // Currently no rejected status in bills
        
        // SQL Aggregations for Chart
        $chartData = (clone $query)
            ->selectRaw("
                DATE(created_at) as date,
                SUM(CASE WHEN status IN ('cleared', 'waived') THEN 1 ELSE 0 END) as Approved,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as Pending,
                0 as Rejected
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();

        // Limited Table Data
        $bills = (clone $query)->with('patient')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $tableData = $bills->map(function($bill) {
            return [
                'claim_id' => 'CLM-' . substr(md5((string)$bill->id), 0, 8),
                'date' => $bill->created_at ? $bill->created_at->format('Y-m-d H:i:s') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'status' => $bill->status === 'pending' ? 'Pending' : ($bill->status === 'cleared' || $bill->status === 'waived' ? 'Approved' : 'Rejected'),
                'amount' => $bill->total_amount,
            ];
        })->toArray();

        return response()->json([
            'kpis' => [
                'submitted' => $submittedCount,
                'claimed_amount' => $claimedAmount,
                'approved' => $approvedCount,
                'pending' => $pendingCount,
                'rejected' => $rejectedCount,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getDiagnosesSummary(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Emr\Models\Diagnosis::query();

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $diagnoses = $query->get();
        $totalDiagnoses = $diagnoses->count();
        $uniquePatients = $diagnoses->unique('patient_id')->count();
        
        $grouped = $diagnoses->groupBy('icd10_code');
        $topDiagnosis = $grouped->sortByDesc(function($group) { return $group->count(); })->first();
        $topName = $topDiagnosis ? $topDiagnosis->first()->description : 'N/A';

        $chartData = $grouped->map(function($group, $code) {
            return [
                'code' => $code,
                'description' => $group->first()->description ?? $code,
                'count' => $group->count(),
            ];
        })->sortByDesc('count')->take(10)->values()->toArray();

        $tableData = $grouped->map(function($group, $code) use ($totalDiagnoses) {
            return [
                'icd10_code' => $code,
                'description' => $group->first()->description ?? $code,
                'cases' => $group->count(),
                'percentage' => $totalDiagnoses > 0 ? round(($group->count() / $totalDiagnoses) * 100, 1) : 0,
            ];
        })->sortByDesc('cases')->values()->toArray();

        return response()->json([
            'kpis' => [
                'total_diagnoses' => $totalDiagnoses,
                'unique_conditions' => $grouped->count(),
                'top_diagnosis' => $topName,
                'unique_patients' => $uniquePatients,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getPatientEncounters(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Emr\Models\Encounter::with(['patient', 'provider']);

        if ($from) $query->whereDate('visit_date', '>=', $from);
        if ($to) $query->whereDate('visit_date', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $encounters = $query->get();
        $totalEncounters = $encounters->count();
        $completed = $encounters->where('status', 'completed')->count();
        $cancelled = $encounters->where('status', 'cancelled')->count();
        $inpatient = $encounters->where('encounter_type', 'inpatient')->count();
        $outpatient = $encounters->where('encounter_type', 'outpatient')->count();

        $chartData = $encounters->groupBy(function($enc) {
            return $enc->visit_date ? $enc->visit_date->format('Y-m-d') : ($enc->created_at ? $enc->created_at->format('Y-m-d') : 'Unknown');
        })->map(function($group, $date) {
            return [
                'date' => $date,
                'Outpatient' => $group->where('encounter_type', 'outpatient')->count(),
                'Inpatient' => $group->where('encounter_type', 'inpatient')->count(),
            ];
        })->values()->sortBy('date')->values()->toArray();

        $tableData = $encounters->sortByDesc('visit_date')->map(function($enc) {
            return [
                'encounter_id' => substr($enc->public_id, 0, 8),
                'date' => $enc->visit_date ? $enc->visit_date->format('Y-m-d H:i') : ($enc->created_at ? $enc->created_at->format('Y-m-d H:i') : 'Unknown'),
                'patient_name' => $enc->patient ? $enc->patient->fullName() : 'Unknown',
                'type' => ucfirst($enc->encounter_type),
                'status' => ucfirst($enc->status),
                'provider' => $enc->provider ? $enc->provider->name : 'N/A',
            ];
        })->values()->toArray();

        return response()->json([
            'kpis' => [
                'total' => $totalEncounters,
                'completed' => $completed,
                'cancelled' => $cancelled,
                'inpatient' => $inpatient,
                'outpatient' => $outpatient,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getPrescriptionsIssued(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = \App\Models\Prescription::with(['doctor', 'items.medication']);

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $prescriptions = $query->get();

        $totalPrescriptions = $prescriptions->count();
        $fullyDispensed = $prescriptions->where('status', 'dispensed')->count();

        // Flatten items to count unique medications and find most prescribed
        $allItems = $prescriptions->flatMap(function ($rx) {
            return $rx->items;
        });
        $uniqueMeds = $allItems->unique('medication_id')->count();
        $medGroups = $allItems->groupBy('medication_id');
        $topMed = $medGroups->sortByDesc(function ($g) { return $g->count(); })->first();
        $topMedName = $topMed && $topMed->first()->medication ? $topMed->first()->medication->name : 'N/A';

        // Chart: top 10 medications by volume
        $chartData = $medGroups->map(function ($group) {
            $first = $group->first();
            return [
                'medication' => $first->medication ? $first->medication->name : 'Unknown',
                'count' => $group->sum('quantity'),
            ];
        })->sortByDesc('count')->take(10)->values()->toArray();

        $tableData = $prescriptions->sortByDesc('created_at')->map(function ($rx) {
            $items = $rx->items->map(function ($item) {
                return ($item->medication ? $item->medication->name : 'Unknown') . ' x' . $item->quantity;
            })->implode(', ');

            return [
                'id' => $rx->id,
                'date' => $rx->created_at ? $rx->created_at->format('Y-m-d H:i') : 'Unknown',
                'doctor_name' => $rx->doctor ? $rx->doctor->name : 'N/A',
                'medication' => $items ?: 'N/A',
                'status' => ucfirst($rx->status ?? 'pending'),
            ];
        })->values()->toArray();

        return response()->json([
            'kpis' => [
                'total_prescriptions' => $totalPrescriptions,
                'unique_medications' => $uniqueMeds,
                'most_prescribed' => $topMedName,
                'fully_dispensed' => $fullyDispensed,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getLabResults(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = \App\Modules\Laboratory\Models\LabOrder::with(['test', 'patient', 'orderedBy']);

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $orders = $query->get();

        $totalOrdered = $orders->count();
        $completed = $orders->where('status', 'resulted')->count();
        $pending = $orders->whereIn('status', ['pending', 'collected', 'processing'])->count();

        // Average turnaround in hours
        $withResults = $orders->whereNotNull('resulted_at')->whereNotNull('created_at');
        $avgTat = $withResults->count() > 0
            ? round($withResults->avg(function ($o) {
                return $o->created_at->diffInMinutes($o->resulted_at) / 60;
            }), 1)
            : 0;

        // Chart: tests by category (donut)
        $chartData = $orders->groupBy(function ($o) {
            return $o->test ? $o->test->category : 'Other';
        })->map(function ($group, $category) {
            return [
                'category' => ucfirst($category),
                'count' => $group->count(),
            ];
        })->values()->toArray();

        $tableData = $orders->sortByDesc('created_at')->map(function ($o) {
            return [
                'public_id' => substr($o->public_id, 0, 8),
                'date_ordered' => $o->created_at ? $o->created_at->format('Y-m-d H:i') : 'Unknown',
                'patient_name' => $o->patient ? $o->patient->fullName() : 'Unknown',
                'test_name' => $o->test ? $o->test->name : 'Unknown',
                'category' => $o->test ? ucfirst($o->test->category) : 'N/A',
                'ordered_by' => $o->orderedBy ? $o->orderedBy->name : 'N/A',
                'date_resulted' => $o->resulted_at ? $o->resulted_at->format('Y-m-d H:i') : '',
                'status' => ucfirst($o->status),
            ];
        })->values()->toArray();

        return response()->json([
            'kpis' => [
                'total_ordered' => $totalOrdered,
                'completed' => $completed,
                'pending' => $pending,
                'avg_turnaround_hours' => $avgTat,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getQueueThroughput(\App\Http\Requests\ReportFilterRequest $request)
    {
        $validated = $request->validated();
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;

        $query = \App\Modules\Queue\Models\QueueTicket::query()
            ->where('state', 'completed');

        if ($from) $query->whereDate('ticket_date', '>=', $from);
        if ($to) $query->whereDate('ticket_date', '<=', $to);

        $branchId = $this->getEffectiveBranchId($request);
        $this->applyBranchScope($query, $branchId);

        // KPIs
        $totalServed = (int) (clone $query)->count();
        $uniqueDays = (int) (clone $query)->distinct('ticket_date')->count('ticket_date');
        $avgPerDay = $uniqueDays > 0 ? (int) round($totalServed / $uniqueDays) : 0;

        $stationCounts = (clone $query)
            ->join('stations', 'queue_tickets.station_id', '=', 'stations.id')
            ->selectRaw('stations.name as station, COUNT(*) as count')
            ->groupBy('stations.name')
            ->orderByDesc('count')
            ->get();
            
        $busiestStation = $stationCounts->first()->station ?? 'N/A';

        $dayCounts = (clone $query)
            ->selectRaw('DATE(ticket_date) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderByDesc('count')
            ->first();
        $busiestDay = $dayCounts->date ?? 'N/A';

        // Chart: grouped by station
        $chartData = $stationCounts->toArray();

        // Table Data
        $tickets = (clone $query)->with('station')
            ->orderByDesc('ticket_date')
            ->limit(100)
            ->get();

        $tableData = $tickets->map(function($t) {
            $waitMinutes = ($t->called_at && $t->served_at) ? $t->called_at->diffInMinutes($t->served_at) : 0;
            $serviceMinutes = ($t->served_at && $t->completed_at) ? $t->served_at->diffInMinutes($t->completed_at) : 0;
            
            return [
                'date' => $t->ticket_date->format('Y-m-d'),
                'station' => $t->station ? $t->station->name : 'Unknown',
                'patients_served' => 1,
                'avg_wait_minutes' => $waitMinutes,
                'avg_service_minutes' => $serviceMinutes,
            ];
        })->toArray();

        return response()->json([
            'kpis' => [
                'total_served' => $totalServed,
                'avg_per_day' => $avgPerDay,
                'busiest_station' => $busiestStation,
                'busiest_day' => $busiestDay,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getWaitTimes(\App\Http\Requests\ReportFilterRequest $request)
    {
        $validated = $request->validated();
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;

        $query = \App\Modules\Queue\Models\QueueTicket::query()
            ->whereNotNull('called_at')
            ->whereNotNull('created_at');

        if ($from) $query->whereDate('ticket_date', '>=', $from);
        if ($to) $query->whereDate('ticket_date', '<=', $to);

        $branchId = $this->getEffectiveBranchId($request);
        $this->applyBranchScope($query, $branchId);

        // SQL Aggregation for Wait Times (TIMESTAMPDIFF works in MySQL)
        $avgWait = (int) (clone $query)->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as avg')->value('avg');
        $slaBreaches = (int) (clone $query)->selectRaw('COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, created_at, called_at) > 60 THEN 1 END) as breaches')->value('breaches');

        // Longest stage (by station)
        $stageWaits = (clone $query)
            ->join('stations', 'queue_tickets.station_id', '=', 'stations.id')
            ->selectRaw('stations.name as station, AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as wait')
            ->groupBy('stations.name')
            ->orderByDesc('wait')
            ->get();
        $longestStage = $stageWaits->first()->station ?? 'N/A';

        // Peak hour
        $hourCounts = (clone $query)
            ->selectRaw('HOUR(created_at) as hour, AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as wait')
            ->groupBy('hour')
            ->orderByDesc('wait')
            ->get();
        $peakHourLabel = $hourCounts->first() ? $hourCounts->first()->hour . ':00' : 'N/A';

        // Chart Data
        $chartData = (clone $query)
            ->join('stations', 'queue_tickets.station_id', '=', 'stations.id')
            ->selectRaw('DATE(ticket_date) as date, stations.name as station, AVG(TIMESTAMPDIFF(MINUTE, queue_tickets.created_at, queue_tickets.called_at)) as wait')
            ->groupBy('date', 'station')
            ->get()
            ->toArray();

        // Limited Table Data
        $tickets = (clone $query)->with('station')
            ->orderByDesc('ticket_date')
            ->limit(100)
            ->get();

        $tableData = $tickets->map(function($t) {
            $wait = $t->created_at->diffInMinutes($t->called_at);
            return [
                'date' => $t->ticket_date->format('Y-m-d'),
                'stage' => $t->station ? $t->station->name : 'Unknown',
                'avg_wait' => $wait,
                'min_wait' => $wait,
                'max_wait' => $wait,
                'patients' => 1,
            ];
        })->toArray();

        return response()->json([
            'kpis' => [
                'avg_wait' => $avgWait,
                'longest_stage' => $longestStage,
                'peak_hour' => $peakHourLabel,
                'sla_breaches' => $slaBreaches,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getPatientVolume(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = \App\Modules\Queue\Models\Visit::with('patient');

        if ($from) $query->whereDate('visit_date', '>=', $from);
        if ($to) $query->whereDate('visit_date', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $visits = $query->get();
        $uniquePatients = $visits->unique('patient_id');
        $totalPatients = $uniquePatients->count();

        // Determine new vs returning: a patient is "new" if this visit range contains their earliest visit ever
        $patientFirstVisits = \App\Modules\Queue\Models\Visit::selectRaw('patient_id, MIN(visit_date) as first_visit')
            ->groupBy('patient_id')
            ->pluck('first_visit', 'patient_id');

        $newPatients = 0;
        $returningPatients = 0;
        foreach ($uniquePatients as $visit) {
            $firstVisit = $patientFirstVisits[$visit->patient_id] ?? null;
            if ($firstVisit && $from && $firstVisit >= $from) {
                $newPatients++;
            } else {
                $returningPatients++;
            }
        }

        $ratio = $totalPatients > 0
            ? round(($newPatients / $totalPatients) * 100) . '% new'
            : 'N/A';

        // Chart: daily new vs returning
        $chartData = $visits->groupBy(fn($v) => $v->visit_date->format('Y-m-d'))
            ->map(function ($dayGroup, $date) use ($patientFirstVisits, $from) {
                $dayPatients = $dayGroup->unique('patient_id');
                $newCount = 0;
                $retCount = 0;
                foreach ($dayPatients as $v) {
                    $fv = $patientFirstVisits[$v->patient_id] ?? null;
                    if ($fv && $from && $fv >= $from) $newCount++;
                    else $retCount++;
                }
                return ['date' => $date, 'new_patients' => $newCount, 'returning' => $retCount];
            })->sortBy('date')->values()->toArray();

        // Table: daily breakdown
        $tableData = $visits->groupBy(fn($v) => $v->visit_date->format('Y-m-d'))
            ->map(function ($dayGroup, $date) use ($patientFirstVisits, $from) {
                $dayPatients = $dayGroup->unique('patient_id');
                $newCount = 0;
                $retCount = 0;
                foreach ($dayPatients as $v) {
                    $fv = $patientFirstVisits[$v->patient_id] ?? null;
                    if ($fv && $from && $fv >= $from) $newCount++;
                    else $retCount++;
                }
                return [
                    'date' => $date,
                    'new_patients' => $newCount,
                    'returning' => $retCount,
                    'total' => $newCount + $retCount,
                ];
            })->sortByDesc('date')->values()->toArray();

        return response()->json([
            'kpis' => [
                'total' => $totalPatients,
                'new_patients' => $newPatients,
                'returning' => $returningPatients,
                'ratio' => $ratio,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getAppointmentStatistics(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        // Use new Appointment model
        $query = \App\Modules\Appointments\Models\Appointment::with(['doctor', 'branch']);

        if ($from) $query->whereDate('appointment_date', '>=', $from);
        if ($to) $query->whereDate('appointment_date', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $appointments = $query->get();
        $totalBooked = $appointments->count();
        $attended = $appointments->filter(fn($a) => in_array($a->status->value ?? $a->status, ['completed', 'checked_in']))->count();
        $missed = $appointments->filter(fn($a) => ($a->status->value ?? $a->status) === 'no_show')->count();
        $cancelled = $appointments->filter(fn($a) => ($a->status->value ?? $a->status) === 'cancelled')->count();
        
        $attendanceRate = $totalBooked > 0 ? round(($attended / $totalBooked) * 100, 1) . '%' : '0%';
        $cancellationRate = $totalBooked > 0 ? round(($cancelled / $totalBooked) * 100, 1) . '%' : '0%';

        // Wait Time Calculation (Check-in vs Consultation Start)
        $waitTimes = $appointments->filter(fn($a) => $a->checked_in_at && $a->consultation_start_time)
            ->map(fn($a) => $a->checked_in_at->diffInMinutes($a->consultation_start_time));
        
        $averageWaitTime = $waitTimes->count() > 0 ? round($waitTimes->average(), 0) : 0;

        // Chart: daily booked/attended/missed
        $chartData = $appointments->groupBy(fn($a) => $a->appointment_date->format('Y-m-d'))
            ->map(function ($group, $date) {
                return [
                    'date' => $date,
                    'booked' => $group->count(),
                    'attended' => $group->filter(fn($a) => in_array($a->status->value ?? $a->status, ['completed', 'checked_in']))->count(),
                    'missed' => $group->filter(fn($a) => ($a->status->value ?? $a->status) === 'no_show')->count(),
                ];
            })->sortBy('date')->values()->toArray();

        $tableData = $appointments->groupBy(fn($a) => $a->appointment_date->format('Y-m-d'))
            ->map(function ($group, $date) {
                $booked = $group->count();
                $att = $group->filter(fn($a) => in_array($a->status->value ?? $a->status, ['completed', 'checked_in']))->count();
                $miss = $group->filter(fn($a) => ($a->status->value ?? $a->status) === 'no_show')->count();
                return [
                    'date' => $date,
                    'booked' => $booked,
                    'attended' => $att,
                    'missed' => $miss,
                    'rate' => $booked > 0 ? round(($att / $booked) * 100, 1) . '%' : '0%',
                ];
            })->sortByDesc('date')->values()->toArray();

        // Channel Split
        $channelSplit = $appointments->groupBy(fn($a) => $a->booked_via ?? 'unknown')
            ->map(fn($group, $channel) => [
                'channel' => ucfirst(str_replace('_', ' ', $channel)),
                'count' => $group->count()
            ])->values()->toArray();

        // Peak Hours
        $peakHours = $appointments->filter(fn($a) => $a->start_time)
            ->groupBy(fn($a) => substr((string)$a->start_time, 0, 2) . ':00')
            ->map(fn($group, $hour) => [
                'hour' => $hour,
                'count' => $group->count()
            ])->sortBy('hour')->values()->toArray();

        // Doctor Utilization (simple booked count for now)
        $doctorUtilization = $appointments->filter(fn($a) => $a->doctor)
            ->groupBy(fn($a) => $a->doctor->name)
            ->map(fn($group, $doctor) => [
                'doctor' => 'Dr. ' . $doctor,
                'appointments' => $group->count()
            ])->sortByDesc('appointments')->values()->toArray();

        return response()->json([
            'kpis' => [
                'total_booked' => $totalBooked,
                'attended' => $attended,
                'missed' => $missed,
                'attendance_rate' => $attendanceRate,
                'cancellation_rate' => $cancellationRate,
                'average_wait_time' => $averageWaitTime,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
            'channel_split' => $channelSplit,
            'peak_hours' => $peakHours,
            'doctor_utilization' => $doctorUtilization,
        ]);
    }

    private function getStockLevels(Request $request)
    {
        // Snapshot report â€” no date range
        $query = \App\Modules\Inventory\Models\InventoryItem::query();

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $items = $query->get();

        $totalItems = $items->count();
        $belowReorder = $items->filter(fn($i) => $i->quantity_on_hand <= $i->reorder_level && $i->quantity_on_hand > 0)->count();
        $outOfStock = $items->where('quantity_on_hand', 0)->count();
        $totalValue = $items->sum(fn($i) => $i->quantity_on_hand * ($i->unit_cost ?? 0));

        // Chart: bottom 10 items by stock percentage
        $chartData = $items->filter(fn($i) => $i->reorder_level > 0)->map(function ($i) {
            return [
                'item' => $i->name,
                'stock_pct' => round(($i->quantity_on_hand / $i->reorder_level) * 100),
            ];
        })->sortBy('stock_pct')->take(10)->values()->toArray();

        $tableData = $items->sortBy('quantity_on_hand')->map(function ($i) {
            $status = 'In Stock';
            if ($i->quantity_on_hand <= 0) $status = 'Out of Stock';
            elseif ($i->quantity_on_hand <= $i->reorder_level) $status = 'Low Stock';

            return [
                'item_name' => $i->name,
                'category' => $i->category ?? 'Uncategorized',
                'unit' => $i->unit ?? 'Unit',
                'quantity_on_hand' => $i->quantity_on_hand,
                'reorder_level' => $i->reorder_level,
                'status' => $status,
                'unit_cost' => $i->unit_cost ?? 0,
                'total_value' => $i->quantity_on_hand * ($i->unit_cost ?? 0),
            ];
        })->values()->toArray();

        return response()->json([
            'kpis' => [
                'total_items' => $totalItems,
                'below_reorder' => $belowReorder,
                'out_of_stock' => $outOfStock,
                'total_value' => $totalValue,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
            'as_of' => Carbon::now()->format('Y-m-d H:i:s'),
        ]);
    }

    private function getExpiringItems(Request $request)
    {
        $withinDays = (int) ($request->query('within_days') ?? 30);
        $cutoffDate = Carbon::now()->addDays($withinDays);

        $query = \App\Modules\Inventory\Models\InventoryBatch::with('item')
            ->where('quantity_remaining', '>', 0)
            ->where(function ($q) use ($cutoffDate) {
                $q->whereNotNull('expiry_date')
                  ->where('expiry_date', '<=', $cutoffDate->format('Y-m-d'));
            });

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $batches = $query->get();
        $now = Carbon::now();

        $expired = $batches->filter(fn($b) => $b->expiry_date && Carbon::parse($b->expiry_date)->isPast())->count();
        $within30 = $batches->filter(fn($b) => $b->expiry_date && !Carbon::parse($b->expiry_date)->isPast() && $now->diffInDays(Carbon::parse($b->expiry_date), false) <= 30)->count();
        $within60 = $batches->filter(fn($b) => $b->expiry_date && !Carbon::parse($b->expiry_date)->isPast() && $now->diffInDays(Carbon::parse($b->expiry_date), false) <= 60)->count();
        $valueAtRisk = $batches->sum(fn($b) => $b->quantity_remaining * $b->unit_cost);

        // Chart: bucket distribution
        $bucketCounts = ['Expired' => 0, '0-7 days' => 0, '8-30 days' => 0, '31-60 days' => 0, '61-90 days' => 0];
        foreach ($batches as $b) {
            if (!$b->expiry_date) continue;
            $daysToExpiry = $now->diffInDays(Carbon::parse($b->expiry_date), false);
            if ($daysToExpiry < 0) $bucketCounts['Expired']++;
            elseif ($daysToExpiry <= 7) $bucketCounts['0-7 days']++;
            elseif ($daysToExpiry <= 30) $bucketCounts['8-30 days']++;
            elseif ($daysToExpiry <= 60) $bucketCounts['31-60 days']++;
            else $bucketCounts['61-90 days']++;
        }
        $chartData = collect($bucketCounts)->map(fn($count, $bucket) => ['bucket' => $bucket, 'count' => $count])->values()->toArray();

        $tableData = $batches->sortBy(function ($b) {
            return $b->expiry_date ?? '9999-12-31';
        })->map(function ($b) use ($now) {
            $daysToExpiry = $b->expiry_date ? $now->diffInDays(Carbon::parse($b->expiry_date), false) : null;
            $urgency = 'Monitor';
            if ($daysToExpiry !== null) {
                if ($daysToExpiry < 0) $urgency = 'Expired';
                elseif ($daysToExpiry <= 7) $urgency = 'Critical';
                elseif ($daysToExpiry <= 30) $urgency = 'Warning';
            }
            return [
                'item_name' => $b->item ? $b->item->name : 'Unknown',
                'batch_number' => $b->batch_number,
                'quantity' => $b->quantity_remaining,
                'expiry_date' => $b->expiry_date,
                'days_to_expiry' => $daysToExpiry ?? 'N/A',
                'unit_cost' => $b->unit_cost,
                'value_at_risk' => $b->quantity_remaining * $b->unit_cost,
                'urgency' => $urgency,
            ];
        })->values()->toArray();

        return response()->json([
            'kpis' => [
                'within_30' => $within30,
                'within_60' => $within60,
                'expired' => $expired,
                'value_at_risk' => $valueAtRisk,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getStockConsumption(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = \App\Modules\Inventory\Models\StockAdjustment::with('item')
            ->where('reason', 'dispensed');

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $adjustments = $query->get();

        // Group by item
        $byItem = $adjustments->groupBy('inventory_item_id');
        $totalItemsConsumed = $byItem->count();
        $totalUnitsDispensed = $adjustments->sum(fn($a) => abs($a->quantity_change));

        $topItem = $byItem->sortByDesc(function ($group) {
            return $group->sum(fn($a) => abs($a->quantity_change));
        })->first();
        $topItemName = $topItem && $topItem->first()->item ? $topItem->first()->item->name : 'N/A';
        $totalValue = $adjustments->sum(function ($a) {
            $unitCost = $a->item ? ($a->item->unit_cost ?? 0) : 0;
            return abs($a->quantity_change) * $unitCost;
        });

        // Chart: top 10 consumed items
        $chartData = $byItem->map(function ($group) {
            $first = $group->first();
            return [
                'item' => $first->item ? $first->item->name : 'Unknown',
                'units' => $group->sum(fn($a) => abs($a->quantity_change)),
            ];
        })->sortByDesc('units')->take(10)->values()->toArray();

        // Table
        $uniqueDays = $adjustments->filter(fn($a) => $a->created_at)->unique(fn($a) => $a->created_at->format('Y-m-d'))->count();
        $tableData = $byItem->map(function ($group) use ($uniqueDays) {
            $first = $group->first();
            $item = $first->item;
            $consumed = $group->sum(fn($a) => abs($a->quantity_change));
            $dailyRate = $uniqueDays > 0 ? round($consumed / $uniqueDays, 1) : 0;
            return [
                'item_name' => $item ? $item->name : 'Unknown',
                'category' => $item ? ($item->category ?? 'Uncategorized') : 'N/A',
                'units_consumed' => $consumed,
                'consumption_rate' => $dailyRate,
                'current_stock' => $item ? $item->quantity_on_hand : 0,
                'days_remaining' => $dailyRate > 0 && $item ? round($item->quantity_on_hand / $dailyRate) : 999,
            ];
        })->sortByDesc('units_consumed')->values()->toArray();

        return response()->json([
            'kpis' => [
                'total_items_consumed' => $totalItemsConsumed,
                'total_units_dispensed' => $totalUnitsDispensed,
                'highest_item' => $topItemName,
                'total_value' => $totalValue,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }
}
