import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePortalPatient } from '@/features/portal/api';

/**
 * Patient portal bento dashboard wired to the portal API: greeting and
 * profile details come from /portal/me. Appointments, bills, lab results,
 * refills and visit history render empty states until their portal
 * endpoints exist — the full portal experience lives at /portal.
 */
export function PatientPortal(): JSX.Element {
  const { user } = useAuth();
  const { patient, isLoading } = usePortalPatient();

  const firstName = patient?.first_name ?? user?.name.split(' ')[0] ?? 'there';

  return (
    <div className="p-lg bg-surface min-h-[calc(100vh-64px)]">
      {/* Welcome Section */}
      <div className="mb-xl">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">
          {isLoading ? 'Welcome back.' : `Welcome back, ${firstName}.`}
        </h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          Your health records, appointments and results in one place.
        </p>
      </div>

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Upcoming Appointment: Priority Card */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-outline-variant shadow-sm rounded-[14px] transition-all hover:shadow-md p-lg flex flex-col gap-lg">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-[10px] font-bold uppercase tracking-wider">
              Appointments
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-2">
            <span className="material-symbols-outlined text-[36px] text-outline-variant">calendar_month</span>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              You have no upcoming appointments. Online booking will appear here once appointment scheduling is enabled.
            </p>
            <Link
              to="/portal/appointments"
              className="mt-2 bg-primary text-white px-lg py-2 rounded-lg text-body-sm font-semibold hover:opacity-90 transition-opacity"
            >
              View Appointments
            </Link>
          </div>
        </div>

        {/* Pay Online: Action Card */}
        <div className="col-span-12 lg:col-span-4 bg-primary-container/5 border-2 border-primary/20 shadow-sm rounded-[14px] transition-all hover:shadow-md p-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-md">
              <h3 className="font-headline-md text-headline-md">Outstanding Bills</h3>
              <span className="material-symbols-outlined text-primary text-[32px]">account_balance_wallet</span>
            </div>
            <div className="mb-lg">
              <p className="text-body-md text-on-surface-variant py-4">
                Your billing summary will appear here once invoices are issued for your visits.
              </p>
            </div>
          </div>
          <Link
            to="/portal/bills"
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">payments</span>
            View Bills
          </Link>
        </div>

        {/* Lab Results: Content Card */}
        <div className="col-span-12 md:col-span-6 bg-white border border-outline-variant shadow-sm rounded-[14px] transition-all hover:shadow-md overflow-hidden flex flex-col">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md">My Lab Results</h3>
            <Link to="/portal/results" className="text-primary font-semibold text-body-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-2">
            <span className="material-symbols-outlined text-[32px] text-outline-variant">labs</span>
            <p className="text-body-md text-on-surface-variant max-w-[260px]">
              Verified lab results will appear here as soon as they are released by the laboratory.
            </p>
          </div>
        </div>

        {/* Prescription Refills */}
        <div className="col-span-12 md:col-span-6 bg-white border border-outline-variant shadow-sm rounded-[14px] transition-all hover:shadow-md flex flex-col">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md">Prescription Refills</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
            <span className="material-symbols-outlined text-[32px] text-outline-variant">medication</span>
            <p className="text-body-md text-on-surface-variant max-w-[260px]">
              Active prescriptions and refill requests will appear here once dispensed by the pharmacy.
            </p>
          </div>
          <div className="px-lg py-lg bg-surface-container-lowest mt-auto rounded-b-[14px]">
            <div className="flex items-center gap-3 p-3 bg-tertiary-container/5 rounded-lg border border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-tertiary">info</span>
              <p className="text-body-sm text-on-tertiary-fixed-variant">Refill requests usually take 24-48 hours to process.</p>
            </div>
          </div>
        </div>

        {/* My Details */}
        <div className="col-span-12 lg:col-span-5 bg-inverse-surface text-inverse-on-surface shadow-sm rounded-[14px] transition-all hover:shadow-md p-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between gap-lg">
            <div>
              <h3 className="text-headline-md font-headline-md mb-4">My Details</h3>
              {isLoading ? (
                <p className="text-body-md text-surface-variant">Loading your profile…</p>
              ) : patient === null ? (
                <p className="text-body-md text-surface-variant">
                  No patient record is linked to this account yet. Contact reception to link your medical file.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-md bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-full border border-white/20 bg-white/10 flex items-center justify-center font-bold">
                      {patient.first_name[0]}
                      {patient.last_name[0]}
                    </div>
                    <div>
                      <p className="text-body-sm font-semibold">{patient.full_name}</p>
                      <p className="text-[11px] text-surface-variant font-data-mono">{patient.patient_number}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-body-sm">
                    <div>
                      <p className="text-[11px] text-surface-variant uppercase">Phone</p>
                      <p>{patient.phone ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-variant uppercase">Blood Group</p>
                      <p>{patient.blood_group ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-variant uppercase">Age</p>
                      <p>{patient.age !== null ? `${patient.age} yrs` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-variant uppercase">County</p>
                      <p>{patient.county ?? '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link
              to="/portal/profile"
              className="w-full bg-primary-fixed text-on-primary-fixed py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <span className="material-symbols-outlined">manage_accounts</span>
              Manage Profile
            </Link>
          </div>
        </div>

        {/* Visit History */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-outline-variant shadow-sm rounded-[14px] transition-all hover:shadow-md overflow-hidden flex flex-col">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md">Visit History</h3>
            <Link to="/portal/records" className="text-primary font-semibold text-body-sm hover:underline">
              My Records
            </Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-2">
            <span className="material-symbols-outlined text-[32px] text-outline-variant">history</span>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              Your visit history will appear here after your first completed visit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
