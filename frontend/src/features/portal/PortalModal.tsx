import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Icon } from '@/components/icons/Icon';

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function PortalModal({
  isOpen, onClose, title, children, maxWidth = 'max-w-md',
}: PortalModalProps): JSX.Element | null {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} animate-fade-in rounded-2xl bg-white shadow-2xl dark:bg-stone-900`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 dark:border-stone-800">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false,
}: ConfirmDialogProps): JSX.Element | null {
  if (!isOpen) return null;
  return (
    <PortalModal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-6 text-stone-600 dark:text-stone-400">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </PortalModal>
  );
}

interface ToastBannerProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function ToastBanner({ message, type = 'success' }: ToastBannerProps): JSX.Element {
  const colours = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  };
  const icons = { success: 'check', error: 'close', info: 'bell' } as const;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${colours[type]}`}>
      <Icon name={icons[type]} size={18} className="shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
