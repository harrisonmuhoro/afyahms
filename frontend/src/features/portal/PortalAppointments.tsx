import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { PortalModal, ConfirmDialog, ToastBanner } from './PortalModal';
import { usePortalPatient } from './api';
import {
  useAppointments,
  useBookAppointment,
  useCancelAppointment,
  useSchedules,
} from '../appointments/api';
import { SlotPicker } from '../appointments/components/SlotPicker';
import { AppointmentStatusBadge } from '../appointments/components/AppointmentStatusBadge';
import type { Appointment, DoctorSchedule } from '../appointments/types';

export function PortalAppointments(): JSX.Element {
  const { patient } = usePortalPatient();
  const patientId = patient?.id;
  
  // Local state
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Booking state
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [bookDate, setBookDate] = useState('');
  const [bookSlot, setBookSlot] = useState<{ start: string; end: string } | null>(null);

  // API Hooks
  const { data: appointmentsData, isLoading: isLoadingApts } = useAppointments();
  const { data: schedulesData } = useSchedules();
  
  const bookMutation = useBookAppointment();
  const cancelMutation = useCancelAppointment();

  // Data processing
  const appointments: Appointment[] = (appointmentsData as any)?.data ?? [];
  const schedules: DoctorSchedule[] = (schedulesData as any)?.data ?? [];

  const upcoming = appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status));
  const past = appointments.filter((a) => !['scheduled', 'confirmed'].includes(a.status));
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCancel = async (id: string): Promise<void> => {
    try {
      await cancelMutation.mutateAsync({ id, reason: 'Cancelled by patient' });
      showToast('Appointment cancelled successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel appointment', 'error');
    }
  };

  const handleBook = async (): Promise<void> => {
    if (!selectedSchedule || !bookDate || !bookSlot || !patientId) return;
    
    try {
      await bookMutation.mutateAsync({
        patient_id: String(patientId),
        doctor_id: selectedSchedule.doctor_id,
        branch_id: selectedSchedule.branch_id,
        schedule_id: selectedSchedule.id,
        type: 'general_consultation', // default for portal
        appointment_date: bookDate,
        start_time: bookSlot.start,
        end_time: bookSlot.end,
        booked_via: 'patient_portal',
      });
      
      setBookingOpen(false);
      setActiveTab('upcoming');
      showToast(`Appointment booked successfully!`);
      
      // Reset form
      setSelectedScheduleId('');
      setBookDate('');
      setBookSlot(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to book appointment', 'error');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast.msg} type={toast.type as 'success' | 'info'} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Appointments</h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">View or book appointments with your care team.</p>
        </div>
        <button
          type="button"
          onClick={() => setBookingOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition-colors hover:bg-teal-700"
        >
          <Icon name="plus" size={18} />
          Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
          >
            {tab} ({tab === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      <div className="space-y-4">
        {isLoadingApts ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
            <p className="text-sm animate-pulse">Loading appointments...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
            <Icon name="calendar" size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No {activeTab} appointments.</p>
            {activeTab === 'upcoming' && (
              <button type="button" onClick={() => setBookingOpen(true)} className="mt-3 text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">
                Book one now →
              </button>
            )}
          </div>
        ) : (
          displayed.map((apt) => {
            const dateObj = new Date(apt.appointment_date);
            const monthStr = dateObj.toLocaleDateString('en-GB', { month: 'short' });
            const dayStr = String(dateObj.getDate()).padStart(2, '0');
            
            return (
              <div key={apt.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      <span className="text-xs font-bold uppercase leading-none">{monthStr}</span>
                      <span className="text-2xl font-black leading-none">{dayStr}</span>
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">
                        {apt.doctor ? `Dr. ${apt.doctor.name}` : 'General Clinic'}
                      </p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {apt.branch?.name} &middot; {apt.start_time.substring(0, 5)} - {apt.end_time.substring(0, 5)}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">ID: {apt.appointment_number}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <AppointmentStatusBadge status={apt.status} />
                    
                    {['scheduled', 'confirmed'].includes(apt.status) && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCancelTarget(apt.id)}
                          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-stone-700 dark:text-red-400">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => { if (cancelTarget) handleCancel(cancelTarget); setCancelTarget(null); }}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This cannot be undone."
        confirmLabel={cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
        danger
      />

      {/* Book Appointment Modal */}
      <PortalModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} title="Book New Appointment" maxWidth="max-w-xl">
        <div className="space-y-6">
          
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Select Clinic / Provider</label>
            <select 
              value={selectedScheduleId} 
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="">-- Choose a Provider --</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>
                  {s.doctor?.name ? `Dr. ${s.doctor.name}` : s.name} - {s.branch?.name}
                </option>
              ))}
            </select>
          </div>

          {selectedScheduleId && (
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Select Date</label>
              <input 
                type="date" 
                value={bookDate} 
                onChange={(e) => { setBookDate(e.target.value); setBookSlot(null); }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" 
              />
            </div>
          )}

          {selectedSchedule && bookDate && (
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Select Time Slot</label>
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 dark:bg-stone-900/50 dark:border-stone-700">
                <SlotPicker 
                  doctorId={selectedSchedule.doctor_id} 
                  branchId={selectedSchedule.branch_id} 
                  date={bookDate} 
                  selectedStartTime={bookSlot?.start}
                  onSelectSlot={(start, end) => setBookSlot({ start, end })}
                />
              </div>
            </div>
          )}
          
        </div>
        
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={() => setBookingOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleBook} 
            disabled={!bookSlot || bookMutation.isPending} 
            className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </PortalModal>
    </div>
  );
}
