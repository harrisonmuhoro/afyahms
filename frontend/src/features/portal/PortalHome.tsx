import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';
import { Link } from 'react-router-dom';

export function PortalHome(): JSX.Element {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'Patient';

  // In a real application, these would be fetched from an API.
  // We're leaving them empty as requested (no mock data).
  const upcomingAppointments: any[] = [];
  const outstandingBillsTotal = 0;
  const recentLabResults: any[] = [];
  const prescriptionRefills: any[] = [];
  const visitHistory: any[] = [];

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
          {upcomingAppointments.length > 0 ? (
            // Render upcoming appointment here when data exists
            <div />
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
              <p className="text-[32px] font-bold text-on-surface">${outstandingBillsTotal.toFixed(2)}</p>
              <p className="text-body-sm text-on-surface-variant">No pending payments</p>
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
               <div />
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
            <button className="text-primary font-semibold text-body-sm hover:underline">Manage All</button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {prescriptionRefills.length > 0 ? (
               <div />
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
               <div />
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
