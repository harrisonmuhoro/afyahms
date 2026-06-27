<?php

namespace App\Modules\Reporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ReportingController extends Controller
{
    public function getDashboardStats(Request $request)
    {
        // Mock data for the Reporting Dashboard since real data aggregation is not yet implemented
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
        // Mock endpoint to return specific report data
        return response()->json([
            'report_type' => $type,
            'message' => 'This report is currently generating mock data.',
            'data' => [
                ['id' => 1, 'label' => 'Item A', 'value' => rand(100, 1000)],
                ['id' => 2, 'label' => 'Item B', 'value' => rand(100, 1000)],
                ['id' => 3, 'label' => 'Item C', 'value' => rand(100, 1000)],
            ]
        ]);
    }
}
