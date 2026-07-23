<?php

namespace App\Modules\Communication\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get the authenticated user's notifications.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $notifications = $user->notifications()->paginate(20);

        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'notifications' => $notifications
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();
        
        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Mark all notifications as read for the authenticated user.
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read']);
    }
    
    /**
     * Generate test notifications for the authenticated user.
     */
    public function generateTestNotifications(Request $request)
    {
        $user = $request->user();
        
        // This is a very simple generic notification using the database channel.
        // Usually you'd create a dedicated Notification class, but this works for testing.
        $user->notify(new class extends \Illuminate\Notifications\Notification {
            public function via($notifiable) { return ['database']; }
            public function toArray($notifiable) {
                $alerts = [
                    ['title' => 'Low Stock Alert', 'message' => 'Paracetamol is running low in Main Pharmacy.', 'icon' => 'inventory'],
                    ['title' => 'New Lab Result', 'message' => 'Complete Blood Count results for John Doe are ready.', 'icon' => 'laboratory'],
                    ['title' => 'System Update', 'message' => 'AfyaHMS has been updated to version 2.1.', 'icon' => 'settings'],
                    ['title' => 'Shift Change', 'message' => 'Your upcoming shift starts in 1 hour.', 'icon' => 'schedule'],
                ];
                return $alerts[array_rand($alerts)];
            }
        });

        return response()->json(['message' => 'Test notification generated successfully']);
    }

    /**
     * Trigger the expiring items check command manually.
     */
    public function triggerExpiringCheck(Request $request)
    {
        \Illuminate\Support\Facades\Artisan::call('afya:check-expiring-items');
        
        return response()->json([
            'message' => 'Expiring items check triggered successfully',
            'output' => \Illuminate\Support\Facades\Artisan::output()
        ]);
    }
}
