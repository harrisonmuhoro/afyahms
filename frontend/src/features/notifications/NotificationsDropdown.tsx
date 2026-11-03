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
  const { data: conversationsData } = useQuery({
    queryKey: ['staff', 'conversations', 'notification-count'],
    queryFn: () => httpClient.get<{ data: Array<{ unread_count?: number }> }>('/messages/conversations'),
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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const messageUnreadCount = (conversationsData?.data ?? []).reduce((sum, conversation) => sum + (conversation.unread_count ?? 0), 0);
  const unreadCount = (data?.unread_count || 0) + messageUnreadCount;
  const notifications = data?.notifications.data || [];

  const unread = notifications.filter((n) => n.read_at === null);
  const earlier = notifications.filter((n) => n.read_at !== null);

  const renderItem = (notification: Notification): JSX.Element => {
    const isUnread = notification.read_at === null;
    return (
      <li key={notification.id}>
        <button
          type="button"
          onClick={() => {
            if (isUnread) markAsRead.mutate(notification.id);
          }}
          className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted ${isUnread ? 'bg-primary-soft/40' : ''}`}
          aria-label={isUnread ? `${notification.data.title} — mark as read` : notification.data.title}
        >
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isUnread ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-ink-muted'}`}>
            <Icon name={(notification.data.icon as IconName) || 'bell'} size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className={`text-sm ${isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-secondary'}`}>
                {notification.data.title}
              </span>
              <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] text-ink-muted">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{notification.data.message}</span>
          </span>
          {isUnread && <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </button>
      </li>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon relative h-10 w-10"
      >
        <Icon name="bell" size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-2 top-[68px] z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-overlay sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Notifications</h3>
              <p className="text-xs text-ink-muted">
                {data?.unread_count ? `${data.unread_count} unread` : 'You are all caught up'}
                {messageUnreadCount > 0 && ` · ${messageUnreadCount} unread message${messageUnreadCount === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => generateTest.mutate()}
                disabled={generateTest.isPending}
                className="text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50"
                title="Send a test notification to yourself"
              >
                Send test
              </button>
              {(data?.unread_count ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4" role="status" aria-label="Loading notifications">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-sunken" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-surface-sunken" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                  <Icon name="bell" size={18} />
                </span>
                <p className="text-sm font-medium text-ink">No notifications</p>
                <p className="mt-1 text-xs text-ink-muted">Results, approvals and alerts for your role will appear here.</p>
              </div>
            ) : (
              <>
                {unread.length > 0 && (
                  <section>
                    <h4 className="sticky top-0 bg-surface px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">New</h4>
                    <ul className="divide-y divide-line">{unread.map(renderItem)}</ul>
                  </section>
                )}
                {earlier.length > 0 && (
                  <section>
                    <h4 className="sticky top-0 bg-surface px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Earlier</h4>
                    <ul className="divide-y divide-line">{earlier.map(renderItem)}</ul>
                  </section>
                )}
              </>
            )}
          </div>

          {messageUnreadCount > 0 && (
            <a href="/messages" className="flex items-center justify-between border-t border-line bg-surface-muted/60 px-4 py-2.5 text-xs font-medium text-primary hover:bg-surface-muted">
              Open messages
              <Icon name="arrowRight" size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
