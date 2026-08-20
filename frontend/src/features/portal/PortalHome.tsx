import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';
import { Link } from 'react-router-dom';
import {
  usePortalInvoices,
  usePortalResults,
  usePortalPrescriptions,
  usePortalDocuments,
} from './api';
import { useAppointments } from '../appointments/api';

export function PortalHome(): JSX.Element {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'Patient';

  // Fetch all dashboard summary data
  const { data: invData }  = usePortalInvoices();
  const { data: resData }  = usePortalResults();
  const { data: rxData }   = usePortalPrescriptions();
  const { data: docData }  = usePortalDocuments();
  const { data: apptData } = useAppointments({ start: new Date().toISOString() });

  const invoices = (invData as any)?.data ?? [];
  const outstandingBillsTotal = invoices.reduce((sum: number, inv: any) => sum + Math.max(0, inv.total_amount - inv.paid_amount), 0);
  
  const upcomingAppointments = (apptData as any)?.data ?? [];
  const nextAppt = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const recentLabResults = ((resData as any)?.data ?? []).filter((r: any) => r.source === 'lab');
  const prescriptionRefills = ((rxData as any)?.data ?? []).filter((rx: any) => rx.status === 'active');
  const visitHistory = (docData as any)?.data ?? [];

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-xl">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Welcome back, {firstName}.</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Here is a summary of your recent health activity.</p>
      </div>

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Upcoming Appointment: Priority Card */}
        <div className="col-span-12 lg:col-span-8 p-lg flex flex-col md:flex-row gap-lg items-center justify-center bg-white border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 rounded-[14px]">
          {nextAppt ? (
            <div className="flex flex-col items-center justify-center text-center py-6 w-full">
              <div className="w-14 h-14 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-3">
                <Icon name="calendar" size={28} />
              </div>
              <h3 className="font-headline-md text-headline-md mb-1 text-on-surface">Next Appointment</h3>
              <p className="text-body-md text-on-surface-variant mb-4">
                {new Date(nextAppt.date).toLocaleDateString('en-GB')} at {nextAppt.time}
              </p>
              <Link to="/portal/appointments" className="bg-primary text-on-primary px-lg py-2.5 rounded-lg text-body-sm font-semibold hover:opacity-90 transition-opacity">
                Manage Appointments
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <Icon name="calendar" size={32} className="text-on-surface-variant" />
              </div>
              <h3 className="font-headline-md text-headline-md mb-2 text-on-surface">No Upcoming Appointments</h3>
              <p className="text-body-md text-on-surface-variant mb-6">You don't have any appointments scheduled.</p>
              <Link to="/portal/appointments" className="bg-primary text-on-primary px-lg py-3 rounded-lg text-body-sm font-semibold hover:opacity-90 transition-opacity">
                Book an Appointment
              </Link>
            </div>
          )}
        </div>

        {/* Pay Online: Action Card */}
        <div className="col-span-12 lg:col-span-4 p-lg flex flex-col justify-between border-2 border-primary/20 bg-primary-container/5 hover:shadow-md transition-all duration-200 rounded-[14px]">
          <div>
            <div className="flex justify-between items-start mb-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">Outstanding Bills</h3>
              <Icon name="wallet" size={32} className="text-primary" />
            </div>
            <div className="mb-lg">
              <p className="text-[32px] font-bold text-on-surface">KES {outstandingBillsTotal.toLocaleString()}</p>
              <p className="text-body-sm text-on-surface-variant">
                {outstandingBillsTotal > 0 ? 'Pending payments' : 'All paid up!'}
              </p>
            </div>
          </div>
          <Link to="/portal/bills" className="w-full bg-primary text-on-primary py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Icon name="payments" size={20} />
            View Billing History
          </Link>
        </div>

        {/* Lab Results: Content Card */}
        <div className="col-span-12 md:col-span-6 flex flex-col bg-white border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 rounded-[14px]">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">My Lab Results</h3>
            <Link to="/portal/results" className="text-primary font-semibold text-body-sm hover:underline">View All</Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {recentLabResults.length > 0 ? (
               <>
                 <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                   <Icon name="laboratory" size={24} />
                 </div>
                 <p className="font-bold text-on-surface">{recentLabResults.length} Lab Results</p>
                 <p className="text-body-sm text-on-surface-variant">Available for viewing</p>
               </>
            ) : (
              <>
                <Icon name="laboratory" size={32} className="text-on-surface-variant mb-3" />
                <p className="text-body-md text-on-surface-variant">No recent lab results</p>
              </>
            )}
          </div>
        </div>

        {/* Prescription Refills */}
        <div className="col-span-12 md:col-span-6 flex flex-col bg-white border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 rounded-[14px]">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Prescription Refills</h3>
            <Link to="/portal/records" className="text-primary font-semibold text-body-sm hover:underline">Manage All</Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {prescriptionRefills.length > 0 ? (
               <>
                 <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3">
                   <Icon name="pharmacy" size={24} />
                 </div>
                 <p className="font-bold text-on-surface">{prescriptionRefills.length} Active Prescriptions</p>
               </>
            ) : (
              <>
                <Icon name="pharmacy" size={32} className="text-on-surface-variant mb-3" />
                <p className="text-body-md text-on-surface-variant">No active prescriptions</p>
              </>
            )}
          </div>
        </div>

        {/* Secure Messaging */}
        <div className="col-span-12 lg:col-span-5 p-lg bg-inverse-surface text-inverse-on-surface relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 rounded-[14px]">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <h3 className="text-headline-md font-headline-md mb-4 text-inverse-on-surface">Secure Messaging</h3>
              <p className="text-body-md text-surface-variant mb-lg">Send a direct, encrypted message to your care team. Average response time is 4 hours.</p>
            </div>
            <Link to="/portal/messages" className="w-full bg-primary-fixed text-on-primary-fixed py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
              <Icon name="send" size={20} />
              Start New Message
            </Link>
          </div>
        </div>

        {/* Visit History */}
        <div className="col-span-12 lg:col-span-7 flex flex-col bg-white border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 rounded-[14px]">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Visit History</h3>
            <Link to="/portal/records" className="text-primary font-semibold text-body-sm hover:underline">Download Records</Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {visitHistory.length > 0 ? (
               <>
                 <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                   <Icon name="clinical" size={24} />
                 </div>
                 <p className="font-bold text-on-surface">{visitHistory.length} Past Visits</p>
               </>
            ) : (
              <>
                <Icon name="fileText" size={32} className="text-on-surface-variant mb-3" />
                <p className="text-body-md text-on-surface-variant">No past visits found</p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <Link to="/portal/appointments" className="fixed bottom-lg right-lg w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group">
        <Icon name="plus" size={28} />
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-inverse-surface text-inverse-on-surface rounded-lg text-body-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Schedule Appointment</span>
      </Link>
    </>
  );
}
