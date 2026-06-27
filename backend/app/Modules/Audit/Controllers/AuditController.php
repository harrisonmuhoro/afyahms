<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditController extends Controller
{
    public function getLogs(Request $request)
    {
        $query = DB::table('activity_log')
            ->leftJoin('users', 'activity_log.causer_id', '=', 'users.id')
            ->select('activity_log.*', 'users.name as causer_name')
            ->orderBy('activity_log.created_at', 'desc');

        if ($request->has('event')) {
            $query->where('activity_log.event', 'like', '%' . $request->query('event') . '%');
        }

        $paginated = $query->paginate(20);

        // Map the data to match frontend expectations
        $mappedData = collect($paginated->items())->map(function ($item) {
            $properties = json_decode($item->properties, true);
            return [
                'id' => $item->id,
                'created_at' => $item->created_at,
                'event' => $item->event ?? $item->description,
                'subject_type' => $item->subject_type,
                'subject_id' => $item->subject_id,
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
