import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastItem {
  id: string;
  title: string;
  variant: 'info' | 'success' | 'error';
}

interface ToastEvent extends CustomEvent {
  detail: { title: string; variant?: ToastItem['variant'] };
}

const DEFAULT_TIMEOUT = 4_000;

export function Toaster(): JSX.Element | null {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as ToastEvent).detail;
      if (detail === undefined) {
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = {
        id,
        title: detail.title,
        variant: detail.variant ?? 'info',
      };
      setToasts((current) => [...current, item]);
      window.setTimeout(() => dismiss(id), DEFAULT_TIMEOUT);
    };

    window.addEventListener('afya:toast', handler as EventListener);

    return () => {
      window.removeEventListener('afya:toast', handler as EventListener);
    };
  }, [dismiss]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto card max-w-md animate-slide-in px-4 py-2 text-sm shadow-lg ${toast.variant === 'error'
              ? 'border-clinical-critical text-clinical-critical'
              : toast.variant === 'success'
                ? 'border-clinical-triage_green text-clinical-triage_green'
                : ''
            }`}
          onClick={() => dismiss(toast.id)}
        >
          {toast.title}
        </div>
      ))}
    </div>,
    document.body,
  );
}