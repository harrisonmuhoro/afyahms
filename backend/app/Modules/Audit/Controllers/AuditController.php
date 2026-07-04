<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditController extends Controller
{
    public function getLogs(Request $request)
    {
        $query = DB::table('audit_logs')
            ->leftJoin('users', 'audit_logs.causer_id', '=', 'users.id')
            ->select('audit_logs.*', 'users.name as causer_name')
            ->orderBy('audit_logs.created_at', 'desc');

        if ($request->has('event')) {
            $query->where('audit_logs.event', 'like', '%' . $request->query('event') . '%');
        }

        if (! $request->user()?->hasRole('superadmin')) {
            $branchId = app()->bound('active_branch_id')
                ? app('active_branch_id')
                : $request->user()?->current_branch_id;

            $query->where('audit_logs.branch_id', $branchId);
        }

        $paginated = $query->paginate(20);

        // Map the data to match frontend expectations
        $mappedData = collect($paginated->items())->map(function ($item) {
            $properties = json_decode($item->properties, true);
            return [
                'id' => $item->id,
                'created_at' => $item->created_at,
                'event' => $item->event,
                'action' => $item->action ?? null,
                'subject_type' => $item->subject_type,
                'subject_id' => $item->subject_id,
                'actor_role' => $item->actor_role ?? null,
                'field_name' => $item->field_name ?? null,
                'old_value' => $item->old_value ?? null,
                'new_value' => $item->new_value ?? null,
                'ip_address' => $item->ip_address ?? null,
                'break_glass_reason' => $item->break_glass_reason ?? null,
                'causer' => $item->causer_name ? ['name' => $item->causer_name] : null,
                'properties' => $properties,
            ];
        });

        return response()->json([
            'data' => $mappedData,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ]
        ]);
    }
}
