<?php

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        // Mock returning settings from the system
        return response()->json([
            'data' => [
                'app_name' => 'Afya HMS',
                'app_version' => env('APP_VERSION', '1.0.0'),
                'timezone' => config('app.timezone'),
                'language' => config('app.locale'),
            ]
        ]);
    }

    public function update(Request $request)
    {
        // Mock updating settings
        return response()->json(['message' => 'Settings updated successfully']);
    }
}
