import { useState, useRef, useEffect } from 'react';
import type { AppointmentStatus } from '../types';
import { Glyph } from '@/components/icons/Glyph';

interface AppointmentActionsMenuProps {
  appointmentId: string;
  status: AppointmentStatus;
  onConfirm?: () => void;
  onCheckIn?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  onNoShow?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  confirm:    'Confirm',
  check_in:   'Check In Patient',
  reschedule: 'Reschedule',
  cancel:     'Cancel Appointment',
  no_show:    'Mark as No-Show',
};

function getAvailableActions(status: AppointmentStatus): string[] {
  switch (status) {
    case 'scheduled':  return ['confirm', 'reschedule', 'cancel'];
    case 'confirmed':  return ['check_in', 'reschedule', 'cancel', 'no_show'];
    case 'checked_in': return ['reschedule', 'cancel'];
    default:           return [];
  }
}

export function AppointmentActionsMenu({
  status,
  onConfirm,
  onCheckIn,
  onCancel,
  onReschedule,
  onNoShow,
}: AppointmentActionsMenuProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actions = getAvailableActions(status);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (actions.length === 0) return null;

  const handlers: Record<string, (() => void) | undefined> = {
    confirm: onConfirm,
    check_in: onCheckIn,
    reschedule: onReschedule,
    cancel: onCancel,
    no_show: onNoShow,
  };

  const handleAction = (action: string) => {
    setOpen(false);
    handlers[action]?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="apt-actions-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        Actions
        <Glyph name="expand_more" size={14} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-xl border border-outline-variant bg-surface py-1 shadow-lg ring-1 ring-black/5 dark:bg-stone-900"
        >
          {actions.map((action) => (
            <button
              key={action}
              role="menuitem"
              type="button"
              onClick={() => handleAction(action)}
              className={[
                'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-container',
                action === 'cancel' || action === 'no_show'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-on-surface',
              ].join(' ')}
            >
              {action === 'confirm'    && <Glyph name="check_circle" size={16} className="text-teal-600" />}
              {action === 'check_in'  && <Glyph name="login" size={16} className="text-green-600" />}
              {action === 'reschedule'&& <Glyph name="schedule" size={16} className="text-blue-600" />}
              {action === 'cancel'    && <Glyph name="cancel" size={16} className="text-red-500" />}
              {action === 'no_show'   && <Glyph name="person_off" size={16} className="text-orange-500" />}
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
