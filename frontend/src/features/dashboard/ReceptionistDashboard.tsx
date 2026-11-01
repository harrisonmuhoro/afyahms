import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoard } from '@/features/queue/api';
import { usePatients, usePatientSearch } from '@/features/patients/api';
import type { QueueTicket, TicketState } from '@/features/queue/types';
import { Glyph } from '@/components/icons/Glyph';

const STATE_CHIP: Partial<Record<TicketState, { label: string; className: string }>> = {
  waiting: { label: 'Waiting', className: 'bg-secondary/10 text-secondary' },
  issued: { label: 'Issued', className: 'bg-secondary/10 text-secondary' },
  called: { label: 'Called', className: 'bg-surface-container-highest text-outline' },
  in_service: { label: 'In Service', className: 'bg-primary/10 text-primary' },
  held: { label: 'On Hold', className: 'bg-surface-container-highest text-outline' },
};

function ticketTime(ticket: QueueTicket): string {
  const iso = ticket.called_at ?? ticket.ticket_date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Receptionist dashboard wired to the REC station board and patient search:
 * live waiting queue, patient search with typeahead results, and recent
 * patient chips. The appointment schedule renders an empty state until a
 * staff-side appointments backend exists (only the patient portal has one).
 */
export function ReceptionistDashboard(): JSX.Element {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { snapshot, isLoading: boardLoading } = useBoard('REC');
  const { hits, isLoading: searching } = usePatientSearch(searchQuery);
  const { data: recentPatients } = usePatients({ perPage: 3 });

  const waiting = snapshot?.waiting ?? [];
  const inService = snapshot?.in_service ?? null;
  const queue: QueueTicket[] = inService !== null ? [inService, ...waiting] : [...waiting];
  const priorityCount = waiting.filter((t) => t.priority !== 'normal').length;

  return (
    <div className="space-y-6">
      {/* Search and Chips Row */}
      <div className="space-y-md">
        <div className="relative max-w-2xl group">
          <Glyph name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[48px] pl-12 pr-4 bg-surface border border-outline-variant rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-body-md shadow-sm transition-all"
            placeholder="Search for patients by name, ID, or phone number..."
            type="text"
          />
          {searchQuery.trim().length >= 2 && (
            <div className="absolute z-20 mt-2 w-full bg-surface border border-outline-variant rounded-2xl shadow-lg overflow-hidden">
              {searching ? (
                <p className="px-4 py-3 text-body-sm text-on-surface-variant">Searching…</p>
              ) : hits.length === 0 ? (
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <p className="text-body-sm text-on-surface-variant">No patients match "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => navigate('/patients/new')}
                    className="text-primary text-body-sm font-semibold hover:underline shrink-0"
                  >
                    Register new
                  </button>
                </div>
              ) : (
                hits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => navigate(`/patients/${hit.id}`)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors text-left border-b border-outline-variant last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">{hit.full_name}</p>
                      <p className="text-body-sm text-on-surface-variant font-data-mono">
                        {hit.patient_number}
                        {hit.phone !== null && ` · ${hit.phone}`}
                      </p>
                    </div>
                    <Glyph name="chevron_right" size={18} className="text-outline shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-sm flex-wrap">
          <span className="font-label-caps text-label-caps text-outline uppercase">Recent Patients:</span>
          {recentPatients.length === 0 ? (
            <span className="text-body-sm text-on-surface-variant">None yet</span>
          ) : (
            recentPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="flex items-center gap-1 px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-body-sm hover:border-primary transition-colors"
              >
                <Glyph name="history" size={16} />
                {patient.full_name}
              </button>
            ))
          )}
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-1 px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-body-sm hover:border-primary transition-colors text-primary font-medium"
          >
            View all
          </button>
        </div>
      </div>

      {/* Action Hero Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <button
          onClick={() => navigate('/patients/new')}
          className="group flex items-center gap-lg p-lg bg-primary text-on-primary rounded-2xl text-left shadow-lg hover:bg-primary-container transition-all active:scale-[0.98]"
        >
          <div className="bg-primary-container/20 p-md rounded-xl">
            <Glyph name="person_add" size={32} />
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md mb-1">Register New Patient</h3>
            <p className="text-primary-fixed opacity-90 font-body-sm">
              Onboard a new visitor and create a medical file instantly.
            </p>
          </div>
          <Glyph name="arrow_forward_ios" className="ml-auto group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/queue/check-in')}
          className="group flex items-center gap-lg p-lg bg-surface border border-outline-variant rounded-2xl text-left shadow-sm hover:bg-surface-container-low transition-all active:scale-[0.98]"
        >
          <div className="bg-surface-container p-md rounded-xl">
            <Glyph name="confirmation_number" size={32} className="text-primary" />
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md mb-1 text-on-surface">Check-in / Issue Ticket</h3>
            <p className="text-on-surface-variant font-body-sm">
              Assign a queue number to a registered patient for today's visit.
            </p>
          </div>
          <Glyph name="arrow_forward_ios" className="ml-auto text-outline group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-surface p-lg border border-outline-variant rounded-2xl shadow-sm">
          <p className="font-label-caps text-label-caps text-outline uppercase mb-2">Waiting Now</p>
          <div className="flex items-end gap-2">
            <h4 className="text-headline-lg font-headline-lg text-on-surface">
              {boardLoading && snapshot === null ? '…' : waiting.length}
            </h4>
            <span className="text-secondary text-[12px] font-bold pb-1">
              {snapshot?.station.name ?? 'Reception'}
            </span>
          </div>
        </div>
        <div className="bg-surface p-lg border border-outline-variant rounded-2xl shadow-sm">
          <p className="font-label-caps text-label-caps text-outline uppercase mb-2">In Service</p>
          <div className="flex items-end gap-2">
            <h4 className="text-headline-lg font-headline-lg text-on-surface">
              {boardLoading && snapshot === null ? '…' : inService !== null ? 1 : 0}
            </h4>
            <span className="text-outline text-[12px] pb-1">
              {inService !== null ? inService.ticket_number : 'Counter free'}
            </span>
          </div>
        </div>
        <div className="bg-surface p-lg border border-outline-variant rounded-2xl shadow-sm">
          <p className="font-label-caps text-label-caps text-outline uppercase mb-2">Priority Cases</p>
          <div className="flex items-end gap-2">
            <h4 className={`text-headline-lg font-headline-lg ${priorityCount > 0 ? 'text-error' : 'text-on-surface'}`}>
              {boardLoading && snapshot === null ? '…' : String(priorityCount).padStart(2, '0')}
            </h4>
            {priorityCount > 0 && <span className="text-error/60 text-[12px] pb-1">Fast-track</span>}
          </div>
        </div>
        <div className="bg-surface p-lg border border-outline-variant rounded-2xl shadow-sm">
          <p className="font-label-caps text-label-caps text-outline uppercase mb-2">Desk Status</p>
          <div className="flex items-end gap-2">
            <h4 className="text-headline-lg font-headline-lg text-on-surface capitalize">
              {snapshot?.station.status ?? '…'}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Area Split */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-lg">
        {/* Left: Active Waiting Queue */}
        <div className="xl:col-span-6 bg-surface border border-outline-variant rounded-2xl shadow-sm flex flex-col min-h-[500px]">
          <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Glyph name="groups" className="text-primary" />
              <h3 className="font-headline-md text-headline-md">Active Waiting Queue</h3>
            </div>
            <button
              onClick={() => navigate('/queue/board/REC')}
              className="text-primary font-label-caps text-label-caps flex items-center gap-1 hover:underline"
            >
              Full board <Glyph name="chevron_right" size={16} />
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="h-10 bg-surface/50">
                  <th className="px-md font-label-caps text-label-caps text-outline uppercase">Ticket</th>
                  <th className="px-md font-label-caps text-label-caps text-outline uppercase">Patient</th>
                  <th className="px-md font-label-caps text-label-caps text-outline uppercase">Priority</th>
                  <th className="px-md font-label-caps text-label-caps text-outline uppercase">Time</th>
                  <th className="px-md font-label-caps text-label-caps text-outline uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {boardLoading && snapshot === null ? (
                  <tr>
                    <td colSpan={5} className="px-md py-10 text-center text-body-md text-on-surface-variant">
                      Loading queue…
                    </td>
                  </tr>
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-md py-10 text-center">
                      <Glyph name="event_seat" size={28} className="text-outline-variant" />
                      <p className="mt-2 text-body-md text-on-surface-variant">No patients in the reception queue.</p>
                    </td>
                  </tr>
                ) : (
                  queue.map((ticket) => {
                    const chip = STATE_CHIP[ticket.state] ?? {
                      label: ticket.state,
                      className: 'bg-surface-container-highest text-outline',
                    };
                    return (
                      <tr
                        key={ticket.id}
                        className="h-14 hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => navigate(`/patients`)}
                      >
                        <td className="px-md font-data-mono text-data-mono text-primary">{ticket.ticket_number}</td>
                        <td className="px-md font-body-md text-on-surface">{ticket.patient_name ?? '—'}</td>
                        <td className="px-md">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              ticket.priority === 'emergency'
                                ? 'bg-error/10 text-error'
                                : ticket.priority === 'priority'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-surface-container text-tertiary'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-md font-body-sm text-outline">{ticketTime(ticket)}</td>
                        <td className="px-md text-right">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${chip.className}`}>
                            {chip.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Today's Schedule — no staff appointments backend yet */}
        <div className="xl:col-span-4 bg-surface border border-outline-variant rounded-2xl shadow-sm flex flex-col">
          <div className="p-md border-b border-outline-variant flex items-center gap-2 bg-surface-container-lowest rounded-t-2xl">
            <Glyph name="event" className="text-primary" />
            <h3 className="font-headline-md text-headline-md">Today's Schedule</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-lg gap-2">
            <Glyph name="calendar_month" size={28} className="text-outline-variant" />
            <p className="text-body-md text-on-surface-variant max-w-[240px]">
              Appointment scheduling will appear here once the appointments module is enabled.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency FAB */}
      <button
        onClick={() => navigate('/queue/check-in?priority=emergency')}
        className="fixed bottom-lg right-lg w-14 h-14 bg-error text-on-error rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all z-50"
        title="Emergency check-in"
      >
        <Glyph name="emergency" />
      </button>
    </div>
  );
}
