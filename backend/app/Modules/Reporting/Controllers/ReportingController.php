<?php

namespace App\Modules\Reporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportingController extends Controller
{
    public function getDashboardStats(Request $request)
    {
                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

        return response()->json([
            'financial' => [
                'revenue_today' => 125000,
                'outstanding_invoices' => 45,
                'sha_claims_pending' => 12,
            ],
            'clinical' => [
                'patients_seen_today' => 142,
                'prescriptions_issued' => 89,
                'lab_tests_conducted' => 56,
            ],
            'operational' => [
                'average_wait_time_mins' => 24,
                'active_staff' => 38,
                'beds_occupied' => 75,
            ]
        ]);
    }

    public function getReportData(Request $request, $type)
    {
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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

        return response()->json([
            'report_type' => $type,
            'message' => 'Unknown report type.',
            'data' => []
        ], 404);
    }

    private function getRevenueSummary(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Billing\Models\Bill::with('patient');

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $bills = $query->get();

        $totalRevenue = $bills->sum('paid_amount');
        $completedCount = $bills->whereIn('status', ['cleared', 'waived'])->count();
        $pendingCount = $bills->whereIn('status', ['pending', 'partial'])->count();

        $chartData = $bills->groupBy(function($bill) {
            return $bill->created_at ? $bill->created_at->format('Y-m-d') : 'Unknown';
        })->map(function($group, $date) {
            return [
                'date' => $date,
                'revenue' => $group->sum('paid_amount'),
            ];
        })->values()->sortBy('date')->values()->toArray();

        $tableData = $bills->sortByDesc('created_at')->map(function($bill) {
            return [
                'public_id' => $bill->public_id,
                'date' => $bill->created_at ? $bill->created_at->format('Y-m-d H:i:s') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'status' => $bill->status,
                'total_amount' => $bill->total_amount,
                'paid_amount' => $bill->paid_amount,
            ];
        })->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

    private function getPaymentsCollected(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Billing\Models\Bill::with('patient')->where('paid_amount', '>', 0);

        if ($from) $query->whereDate('updated_at', '>=', $from);
        if ($to) $query->whereDate('updated_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $bills = $query->get();

        $totalCollected = $bills->sum('paid_amount');
        $cashPayments = $bills->where('payment_method', 'cash')->sum('paid_amount');
        $mpesaPayments = $bills->where('payment_method', 'mpesa')->sum('paid_amount');
        $insurancePayments = $bills->where('payment_method', 'insurance')->sum('paid_amount');

        $chartData = $bills->groupBy(function($bill) {
            return $bill->updated_at ? $bill->updated_at->format('Y-m-d') : 'Unknown';
        })->map(function($group, $date) {
            return [
                'date' => $date,
                'Cash' => $group->where('payment_method', 'cash')->sum('paid_amount'),
                'M-Pesa' => $group->where('payment_method', 'mpesa')->sum('paid_amount'),
                'Insurance' => $group->where('payment_method', 'insurance')->sum('paid_amount'),
            ];
        })->values()->sortBy('date')->values()->toArray();

        $tableData = $bills->sortByDesc('updated_at')->map(function($bill) {
            return [
                'public_id' => $bill->public_id,
                'date' => $bill->updated_at ? $bill->updated_at->format('Y-m-d H:i:s') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'channel' => ucfirst($bill->payment_method ?? 'Cash'),
                'reference' => 'REF-' . substr(md5($bill->id), 0, 8),
                'amount' => $bill->paid_amount,
            ];
        })->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

    private function getOutstandingInvoices(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Billing\Models\Bill::with('patient')->whereIn('status', ['pending', 'partial']);

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $bills = $query->get();

        $totalOutstanding = $bills->sum(function($bill) { return $bill->total_amount - $bill->paid_amount; });
        $fullyUnpaid = $bills->where('paid_amount', 0)->count();
        $partiallyPaid = $bills->where('paid_amount', '>', 0)->count();
        
        $oldestUnpaid = $bills->min('created_at');
        $oldestUnpaidDate = $oldestUnpaid ? $oldestUnpaid->format('Y-m-d') : 'N/A';

        // Chart Data grouped by aging bucket
        $now = Carbon::now();
        $buckets = [
            '0-30 days' => 0,
            '31-60 days' => 0,
            '61-90 days' => 0,
            '90+ days' => 0,
        ];

        foreach ($bills as $bill) {
            $days = $now->diffInDays($bill->created_at);
            $balance = $bill->total_amount - $bill->paid_amount;
            if ($days <= 30) $buckets['0-30 days'] += $balance;
            elseif ($days <= 60) $buckets['31-60 days'] += $balance;
            elseif ($days <= 90) $buckets['61-90 days'] += $balance;
            else $buckets['90+ days'] += $balance;
        }

        $chartData = [];
        foreach ($buckets as $bucket => $amount) {
            $chartData[] = [
                'bucket' => $bucket,
                'amount' => $amount
            ];
        }

        $tableData = $bills->sortByDesc('created_at')->map(function($bill) use ($now) {
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
        })->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

    private function getShaClaims(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Billing\Models\Bill::with('patient')->where('payment_method', 'insurance');

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $bills = $query->get();

        $submittedCount = $bills->count();
        $claimedAmount = $bills->sum('total_amount');
        $approvedCount = $bills->whereIn('status', ['cleared', 'waived'])->count();
        $pendingCount = $bills->where('status', 'pending')->count();
        $rejectedCount = 0; // Currently no rejected status in bills
        
        $chartData = $bills->groupBy(function($bill) {
            return $bill->created_at ? $bill->created_at->format('Y-m-d') : 'Unknown';
        })->map(function($group, $date) {
            return [
                'date' => $date,
                'Approved' => $group->whereIn('status', ['cleared', 'waived'])->count(),
                'Pending' => $group->where('status', 'pending')->count(),
                'Rejected' => 0,
            ];
        })->values()->sortBy('date')->values()->toArray();

        $tableData = $bills->sortByDesc('created_at')->map(function($bill) {
            return [
                'claim_id' => 'CLM-' . substr(md5($bill->id), 0, 8),
                'date' => $bill->created_at ? $bill->created_at->format('Y-m-d H:i:s') : 'Unknown',
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'status' => $bill->status === 'pending' ? 'Pending' : ($bill->status === 'cleared' || $bill->status === 'waived' ? 'Approved' : 'Rejected'),
                'amount' => $bill->total_amount,
            ];
        })->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

    private function getQueueThroughput(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = \App\Modules\Queue\Models\QueueTicket::with('station')
            ->where('state', 'completed');

        if ($from) $query->whereDate('ticket_date', '>=', $from);
        if ($to) $query->whereDate('ticket_date', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $tickets = $query->get();
        $totalServed = $tickets->count();
        $uniqueDays = $tickets->unique(function ($t) { return $t->ticket_date->format('Y-m-d'); })->count();
        $avgPerDay = $uniqueDays > 0 ? round($totalServed / $uniqueDays) : 0;

        $stationCounts = $tickets->groupBy(function ($t) {
            return $t->station ? $t->station->name : 'Unknown';
        })->map(function ($g) { return $g->count(); });
        $busiestStation = $stationCounts->sortDesc()->keys()->first() ?? 'N/A';

        $dayCounts = $tickets->groupBy(function ($t) { return $t->ticket_date->format('Y-m-d'); })
            ->map(function ($g) { return $g->count(); });
        $busiestDay = $dayCounts->sortDesc()->keys()->first() ?? 'N/A';

        // Chart: grouped by station per day
        $chartData = $tickets->groupBy(function ($t) {
            return $t->station ? $t->station->name : 'Unknown';
        })->map(function ($group, $station) {
            return [
                'station' => $station,
                'count' => $group->count(),
            ];
        })->values()->toArray();

        // Table: per-day per-station breakdown
        $tableData = $tickets->groupBy(function ($t) {
            return $t->ticket_date->format('Y-m-d') . '|' . ($t->station ? $t->station->name : 'Unknown');
        })->map(function ($group, $key) {
            [$date, $station] = explode('|', $key);
            $waitTimes = $group->filter(fn($t) => $t->called_at && $t->served_at)->map(fn($t) => $t->called_at->diffInMinutes($t->served_at));
            $serviceTimes = $group->filter(fn($t) => $t->served_at && $t->completed_at)->map(fn($t) => $t->served_at->diffInMinutes($t->completed_at));
            return [
                'date' => $date,
                'station' => $station,
                'patients_served' => $group->count(),
                'avg_wait_minutes' => $waitTimes->count() > 0 ? round($waitTimes->avg()) : 0,
                'avg_service_minutes' => $serviceTimes->count() > 0 ? round($serviceTimes->avg()) : 0,
            ];
        })->sortBy('date')->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

    private function getWaitTimes(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = \App\Modules\Queue\Models\QueueTicket::with('station');

        if ($from) $query->whereDate('ticket_date', '>=', $from);
        if ($to) $query->whereDate('ticket_date', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $tickets = $query->get();

        // Calculate wait time per ticket (called_at - created_at, roughly)
        $withWait = $tickets->filter(fn($t) => $t->called_at && $t->created_at);
        $waitMinutes = $withWait->map(fn($t) => $t->created_at->diffInMinutes($t->called_at));
        $avgWait = $waitMinutes->count() > 0 ? round($waitMinutes->avg()) : 0;

        // Longest stage (by station)
        $stageWaits = $withWait->groupBy(function ($t) {
            return $t->station ? $t->station->name : 'Unknown';
        })->map(function ($group) {
            return round($group->avg(fn($t) => $t->created_at->diffInMinutes($t->called_at)));
        });
        $longestStage = $stageWaits->sortDesc()->keys()->first() ?? 'N/A';

        // Peak hour
        $hourCounts = $withWait->filter(fn($t) => $t->created_at)->groupBy(fn($t) => $t->created_at->format('H'))
            ->map(fn($g) => round($g->avg(fn($t) => $t->created_at->diffInMinutes($t->called_at))));
        $peakHour = $hourCounts->sortDesc()->keys()->first();
        $peakHourLabel = $peakHour !== null ? $peakHour . ':00' : 'N/A';

        // SLA breaches (> 60 min)
        $slaBreaches = $waitMinutes->filter(fn($m) => $m > 60)->count();

        // Chart: daily avg wait per station
        $chartData = $withWait->groupBy(fn($t) => $t->ticket_date->format('Y-m-d'))
            ->map(function ($dayGroup, $date) {
                $row = ['date' => $date];
                $byStation = $dayGroup->groupBy(fn($t) => $t->station ? $t->station->name : 'Unknown');
                foreach ($byStation as $station => $group) {
                    $row[$station] = round($group->avg(fn($t) => $t->created_at->diffInMinutes($t->called_at)));
                }
                return $row;
            })->sortBy('date')->values()->toArray();

        // Table: per-day per-stage
        $tableData = $withWait->groupBy(function ($t) {
            return $t->ticket_date->format('Y-m-d') . '|' . ($t->station ? $t->station->name : 'Unknown');
        })->map(function ($group, $key) {
            [$date, $stage] = explode('|', $key);
            $waits = $group->map(fn($t) => $t->created_at->diffInMinutes($t->called_at));
            return [
                'date' => $date,
                'stage' => $stage,
                'avg_wait' => round($waits->avg()),
                'min_wait' => $waits->min(),
                'max_wait' => $waits->max(),
                'patients' => $group->count(),
            ];
        })->sortBy('date')->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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
                return ['date' => $date, 'New' => $newCount, 'Returning' => $retCount];
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
                    'returning_patients' => $retCount,
                    'total' => $newCount + $retCount,
                ];
            })->sortByDesc('date')->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

        return response()->json([
            'kpis' => [
                'total_patients' => $totalPatients,
                'new_patients' => $newPatients,
                'returning_patients' => $returningPatients,
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

        // Use visits with visit_type = appointment to derive appointment data
        $query = \App\Modules\Queue\Models\Visit::where('visit_type', 'appointment');

        if ($from) $query->whereDate('visit_date', '>=', $from);
        if ($to) $query->whereDate('visit_date', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId && $branchId !== 'all') $query->where('branch_id', $branchId);
        }

        $visits = $query->get();
        $totalBooked = $visits->count();
        $attended = $visits->whereIn('status', ['completed', 'in_progress'])->count();
        $missed = $visits->where('status', 'cancelled')->count();
        $attendanceRate = $totalBooked > 0 ? round(($attended / $totalBooked) * 100, 1) : 0;

        // Chart: daily booked/attended/missed
        $chartData = $visits->groupBy(fn($v) => $v->visit_date->format('Y-m-d'))
            ->map(function ($group, $date) {
                return [
                    'date' => $date,
                    'Booked' => $group->count(),
                    'Attended' => $group->whereIn('status', ['completed', 'in_progress'])->count(),
                    'Missed' => $group->where('status', 'cancelled')->count(),
                ];
            })->sortBy('date')->values()->toArray();

        $tableData = $visits->groupBy(fn($v) => $v->visit_date->format('Y-m-d'))
            ->map(function ($group, $date) {
                $booked = $group->count();
                $att = $group->whereIn('status', ['completed', 'in_progress'])->count();
                $miss = $group->where('status', 'cancelled')->count();
                return [
                    'date' => $date,
                    'booked' => $booked,
                    'attended' => $att,
                    'missed' => $miss,
                    'cancelled' => $miss,
                    'attendance_rate' => $booked > 0 ? round(($att / $booked) * 100, 1) : 0,
                ];
            })->sortByDesc('date')->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

        return response()->json([
            'kpis' => [
                'total_booked' => $totalBooked,
                'attended' => $attended,
                'missed' => $missed,
                'attendance_rate' => $attendanceRate,
            ],
            'chart_data' => $chartData,
            'table_data' => $tableData,
        ]);
    }

    private function getStockLevels(Request $request)
    {
        // Snapshot report — no date range
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
            $status = 'Adequate';
            if ($i->quantity_on_hand <= 0) $status = 'Out of Stock';
            elseif ($i->quantity_on_hand <= $i->reorder_level * 0.5) $status = 'Critical';
            elseif ($i->quantity_on_hand <= $i->reorder_level) $status = 'Low';

            return [
                'name' => $i->name,
                'category' => $i->category ?? 'Uncategorized',
                'unit' => $i->unit ?? 'Unit',
                'quantity' => $i->quantity_on_hand,
                'reorder_level' => $i->reorder_level,
                'status' => $status,
                'unit_cost' => $i->unit_cost ?? 0,
                'total_value' => $i->quantity_on_hand * ($i->unit_cost ?? 0),
            ];
        })->values()->toArray();

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

                if ($type === 'sha-claims') return $this->getShaClaims($request);
        if ($type === 'diagnoses-summary') return $this->getDiagnosesSummary($request);
        if ($type === 'patient-encounters') return $this->getPatientEncounters($request);

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

    private function getShaClaims(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');
        
        $query = \App\Modules\Billing\Models\Bill::with('patient')->where('payment_method', 'insurance');

        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);

        $user = $request->user();
        if ($request->has('branch_id') && $user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            $branchId = $request->query('branch_id');
            if ($branchId) $query->where('branch_id', $branchId);
        }

        $bills = $query->get();

        $submittedCount = $bills->count();
        $approvedCount = $bills->whereIn('status', ['cleared', 'waived'])->count();
        $rejectedCount = 0;
        
        $chartData = $bills->groupBy(function($bill) {
            return $bill->created_at->format('Y-m-d');
        })->map(function($group, $date) {
            return [
                'date' => $date,
                'claims_amount' => $group->sum('total_amount'),
            ];
        })->values()->sortBy('date')->values()->toArray();

        $tableData = $bills->sortByDesc('created_at')->map(function($bill) {
            return [
                'claim_id' => 'CLM-' . substr(md5($bill->id), 0, 8),
                'date' => $bill->created_at->format('Y-m-d H:i:s'),
                'patient_name' => $bill->patient ? $bill->patient->fullName() : 'Unknown',
                'status' => $bill->status === 'pending' ? 'Pending' : ($bill->status === 'cleared' ? 'Approved' : 'Rejected'),
                'amount' => $bill->total_amount,
            ];
        })->values()->toArray();

        return response()->json([
            'kpis' => [
                'submitted' => $submittedCount,
                'approved' => $approvedCount,
                'rejected' => $rejectedCount,
                'avg_processing_days' => 14,
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
            if ($branchId) $query->where('branch_id', $branchId);
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
            if ($branchId) $query->where('branch_id', $branchId);
        }

        $encounters = $query->get();
        $totalEncounters = $encounters->count();
        $completed = $encounters->where('status', 'completed')->count();
        $cancelled = $encounters->where('status', 'cancelled')->count();
        $inpatient = $encounters->where('encounter_type', 'inpatient')->count();
        $outpatient = $encounters->where('encounter_type', 'outpatient')->count();

        $chartData = $encounters->groupBy(function($enc) {
            return $enc->visit_date ? $enc->visit_date->format('Y-m-d') : $enc->created_at->format('Y-m-d');
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
                'date' => $enc->visit_date ? $enc->visit_date->format('Y-m-d H:i') : $enc->created_at->format('Y-m-d H:i'),
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
}
