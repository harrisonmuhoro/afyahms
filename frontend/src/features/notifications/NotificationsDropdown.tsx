import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import { Icon, type IconName } from '@/components/icons/Icon';
import { formatDistanceToNow } from 'date-fns';

interface NotificationData {
  title: string;
  message: string;
  icon?: IconName;
}

interface Notification {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationsResponse {
  unread_count: number;
  notifications: {
    data: Notification[];
    current_page: number;
    last_page: number;
  };
}

export function NotificationsDropdown(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications with polling every 30 seconds
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => httpClient.get<NotificationsResponse>('/notifications').then(res => res),
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => httpClient.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsRead = useMutation({
    mutationFn: () => httpClient.post('/notifications/mark-all-read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const generateTest = useMutation({
    mutationFn: () => httpClient.post('/notifications/test'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = data?.unread_count || 0;
  const notifications = data?.notifications.data || [];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all relative"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1 border border-surface">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface dark:bg-inverse-surface border border-outline-variant dark:border-on-surface-variant rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant dark:border-on-surface-variant bg-surface-container-lowest">
            <h3 className="font-bold text-on-surface">Notifications</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => generateTest.mutate()}
                className="text-xs text-primary hover:text-primary-600 transition-colors font-medium"
                title="Generate test notification"
              >
                Test
              </button>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="text-xs text-primary hover:text-primary-600 transition-colors font-medium disabled:opacity-50"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                <Icon name="bell" size={32} className="opacity-20 mb-3" />
                <p className="text-sm">You have no notifications.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant dark:divide-on-surface-variant">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 flex gap-3 hover:bg-surface-container-lowest transition-colors cursor-pointer group ${!notification.read_at ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                    onClick={() => {
                      if (!notification.read_at) {
                        markAsRead.mutate(notification.id);
                      }
                    }}
                  >
                    <div className={`mt-1 shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${!notification.read_at ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <Icon name={(notification.data.icon as IconName) || 'bell'} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${!notification.read_at ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {notification.data.title}
                        </p>
                        <span className="text-[10px] text-tertiary whitespace-nowrap pt-0.5">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${!notification.read_at ? 'text-on-surface-variant' : 'text-tertiary'}`}>
                        {notification.data.message}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="shrink-0 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" title="Mark as read"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="border-t border-outline-variant dark:border-on-surface-variant p-2 bg-surface-container-lowest text-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface w-full py-2 rounded-lg hover:bg-surface-container transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
