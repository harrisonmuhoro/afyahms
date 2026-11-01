import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAdminStaff } from '@/features/admin-staff/api';
import { Glyph } from '@/components/icons/Glyph';

const TABS = [
  { id: 'Branch Management', icon: 'domain' },
  { id: 'Roles & Permissions', icon: 'shield_person' },
  { id: 'Clinical Templates', icon: 'clinical_notes' },
  { id: 'Inventory Master', icon: 'inventory_2' },
  { id: 'Billing Config', icon: 'receipt_long' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * System settings wired to real branch + staff data: the branch panel reads
 * the active branch from BranchProvider (editing happens via the Branches
 * admin modal), and the clinicians strip lists real staff. Tabs without a
 * backend (templates, billing config) render explicit empty states.
 */
export function SystemSettings(): JSX.Element {
  const [activeTab, setActiveTab] = useState('Branch Management');
  const { branches, activeBranch, isLoading: branchesLoading } = useBranches();
  const { staff, isLoading: staffLoading } = useAdminStaff('');

  const activeStaff = staff.filter((member) => member.is_active).slice(0, 5);

  return (
    <div className="p-lg bg-surface min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-xl">
          <h2 className="text-headline-lg font-headline-lg text-on-surface mb-1">System Settings &amp; Administration</h2>
          <p className="text-body-md text-on-surface-variant">Manage global branch configurations, security protocols, and operational workflows.</p>
        </div>
        {/* Bento Layout Settings Container */}
        <div className="grid grid-cols-12 gap-lg">
          {/* Vertical Nested Tabs Navigation */}
          <div className="col-span-3 flex flex-col gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between w-full p-md text-left rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-surface-container-highest border border-outline-variant text-primary'
                    : 'hover:bg-surface-container border border-transparent text-on-surface-variant group'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Glyph name={tab.icon} className={`${activeTab === tab.id ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`} />
                  <span className={`text-body-md font-semibold ${activeTab === tab.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {tab.id}
                  </span>
                </div>
                <Glyph name="chevron_right" size={14} className={`${activeTab === tab.id ? 'text-primary' : 'text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity'}`} />
              </button>
            ))}
            <div className="mt-lg p-md bg-primary-container/5 rounded-xl border border-primary/10">
              <h4 className="text-label-caps font-label-caps text-primary mb-2 uppercase">Current Branch</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface border border-outline-variant flex items-center justify-center">
                  <Glyph name="local_hospital" className="text-primary" />
                </div>
                <div>
                  <p className="text-body-md font-bold leading-none">
                    {branchesLoading ? 'Loading…' : activeBranch?.name ?? 'No branch selected'}
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {activeBranch !== null ? `Code: ${activeBranch.code}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Settings Content Panel */}
          <div className="col-span-9 space-y-lg">
            {activeTab === 'Branch Management' && (
              <>
                {/* Branch Details Card */}
                <section className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                  <div className="p-md border-b border-outline-variant flex justify-between items-center">
                    <h3 className="font-headline-md text-headline-md">Branch Operations</h3>
                    <Link
                      to="/branches"
                      className="bg-primary text-white px-4 py-1.5 rounded-lg text-body-md hover:bg-secondary transition-all"
                    >
                      Manage Branches
                    </Link>
                  </div>
                  {branchesLoading ? (
                    <p className="p-lg text-body-md text-on-surface-variant">Loading branch details…</p>
                  ) : activeBranch === null ? (
                    <div className="p-lg text-center">
                      <Glyph name="domain_disabled" size={28} className="text-outline-variant" />
                      <p className="mt-2 text-body-md text-on-surface-variant">No active branch selected.</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-lg grid grid-cols-2 gap-xl">
                        <div className="space-y-base">
                          <p className="text-body-sm font-semibold text-on-surface-variant">Branch Name</p>
                          <p className="w-full h-[38px] border border-outline-variant rounded-lg px-3 text-body-md flex items-center bg-surface-container-lowest">
                            {activeBranch.name}
                          </p>
                        </div>
                        <div className="space-y-base">
                          <p className="text-body-sm font-semibold text-on-surface-variant">Branch Code</p>
                          <p className="w-full h-[38px] border border-outline-variant rounded-lg px-3 text-body-md font-data-mono flex items-center bg-surface-container-lowest">
                            {activeBranch.code}
                          </p>
                        </div>
                        <div className="space-y-base">
                          <p className="text-body-sm font-semibold text-on-surface-variant">Contact Line</p>
                          <div className="relative">
                            <Glyph name="call" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                            <p className="w-full h-[38px] border border-outline-variant rounded-lg pl-10 pr-3 text-body-md flex items-center bg-surface-container-lowest">
                              {activeBranch.phone ?? '—'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-base">
                          <p className="text-body-sm font-semibold text-on-surface-variant">Timezone / Currency</p>
                          <p className="w-full h-[38px] border border-outline-variant rounded-lg px-3 text-body-md flex items-center bg-surface-container-lowest">
                            {activeBranch.timezone} · {activeBranch.currency}
                          </p>
                        </div>
                      </div>
                      <div className="px-lg pb-lg">
                        <p className="text-body-sm font-semibold text-on-surface-variant block mb-base">Operational Address</p>
                        <p className="w-full border border-outline-variant rounded-lg p-3 text-body-md bg-surface-container-lowest min-h-[56px]">
                          {activeBranch.address ?? 'No address on file.'}
                        </p>
                      </div>
                    </>
                  )}
                </section>
                {/* Advanced Settings Grid */}
                <div className="grid grid-cols-2 gap-lg">
                  {/* All Branches */}
                  <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-lg">
                    <h3 className="font-headline-md text-headline-md mb-md">All Branches</h3>
                    {branchesLoading ? (
                      <p className="text-body-sm text-on-surface-variant">Loading…</p>
                    ) : branches.length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant">No branches configured yet.</p>
                    ) : (
                      <div className="space-y-sm">
                        {branches.map((branch) => (
                          <div
                            key={branch.id}
                            className="flex items-center justify-between p-2 hover:bg-surface-container-low rounded-lg transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary">
                                <Glyph name="domain" size={20} />
                              </div>
                              <div>
                                <p className="text-body-md font-semibold">{branch.name}</p>
                                <p className="text-[11px] text-on-surface-variant font-data-mono">{branch.code}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${branch.is_active ? 'bg-primary' : 'bg-error'}`} />
                              <span className="text-body-sm">{branch.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Link
                      to="/branches"
                      className="block text-center w-full mt-md border border-primary text-primary px-4 py-2 rounded-lg text-body-md font-semibold hover:bg-primary-container/10 transition-all"
                    >
                      Add / Edit Branches
                    </Link>
                  </div>
                  {/* Active Staff */}
                  <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-lg">
                    <h3 className="font-headline-md text-headline-md mb-md">Active Staff</h3>
                    {staffLoading ? (
                      <p className="text-body-sm text-on-surface-variant">Loading staff…</p>
                    ) : activeStaff.length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant">No active staff members found.</p>
                    ) : (
                      <div className="space-y-sm">
                        {activeStaff.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-primary">
                                {initials(member.name)}
                              </div>
                              <div>
                                <p className="text-body-md font-semibold">{member.name}</p>
                                <p className="text-[11px] text-on-surface-variant">
                                  {member.department ?? member.specialization ?? 'Staff'} • Active
                                </p>
                              </div>
                            </div>
                            {member.staff_id !== null && (
                              <span className="bg-secondary-container/50 text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold font-data-mono">
                                {member.staff_id}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Link
                      to="/admin/staff"
                      className="block text-center w-full mt-md border border-primary text-primary px-4 py-2 rounded-lg text-body-md font-semibold hover:bg-primary-container/10 transition-all"
                    >
                      Manage All Users
                    </Link>
                  </div>
                </div>
                {/* Insurance tiers — no backend yet */}
                <section className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                  <div className="p-md bg-surface-container-low border-b border-outline-variant">
                    <h3 className="font-headline-md text-headline-md">Finance &amp; Insurance Tiers</h3>
                  </div>
                  <div className="py-10 text-center">
                    <Glyph name="payments" size={28} className="text-outline-variant" />
                    <p className="mt-2 text-body-md text-on-surface-variant">
                      Insurance scheme configuration will appear here once the finance module is enabled.
                    </p>
                  </div>
                </section>
              </>
            )}
            {activeTab !== 'Branch Management' && (
              <div className="bg-white rounded-xl border border-dashed border-outline-variant flex flex-col items-center justify-center h-64 text-on-surface-variant gap-2">
                <Glyph name="construction" size={28} className="text-outline-variant" />
                <p className="text-body-md">{activeTab} configuration will appear here once its backend module is enabled.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
