import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useBranches } from './BranchProvider';
import type { Branch } from './BranchProvider';
import { Icon } from '@/components/icons/Icon';
import { useAuth } from '@/features/auth/AuthProvider';
import { BranchModal } from './BranchModal';

export function BranchesPage(): JSX.Element {
  const { t } = useTranslation(['branches', 'common']);
  const { branches, isLoading, error } = useBranches();
  const { hasPermission } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);

  const canCreate = hasPermission('branches.create');
  const canUpdate = hasPermission('branches.update');

  const openAddModal = () => {
    setBranchToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setBranchToEdit(branch);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-500 dark:from-stone-100 dark:to-stone-400">
            {t('branches:title')}
          </h1>
          <p className="mt-2 text-sm text-stone-500 font-medium">Manage hospital locations and clinics</p>
        </div>
        {canCreate && (
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            + Add Branch
          </button>
        )}
      </div>

      {error !== null && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50/80 text-rose-600 border border-rose-200 backdrop-blur-sm flex items-center gap-3">
          <Icon name="close" size={20} />
          <span className="text-sm font-medium">{t('common:loading', 'Failed to load branches.')}</span>
        </div>
      )}

      {isLoading && (
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
        </div>
      )}

      {!isLoading && branches.length === 0 && (
        <div className="py-20 text-center bg-white/40 dark:bg-stone-950/40 rounded-3xl border border-stone-200/50 dark:border-stone-800/50">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-900 mb-4">
            <Icon name="business" size={32} className="text-stone-400" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('common:none')}</h3>
          <p className="mt-1 text-sm text-stone-500">No branches have been configured yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {branches.map((branch, idx) => (
          <div 
            key={branch.id} 
            className="group relative bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Background glowing orb */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl pointer-events-none ${branch.is_active ? 'bg-emerald-500' : 'bg-stone-500'}`}></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${branch.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-stone-50 text-stone-500 dark:bg-stone-800 dark:text-stone-400 border border-stone-200 dark:border-stone-700'}`}>
                  <Icon name="business" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 group-hover:text-brand-600 transition-colors">
                    {branch.name}
                  </h3>
                  <p className="text-xs font-mono text-stone-500 mt-0.5">
                    {branch.code}
                  </p>
                </div>
              </div>
              
              <div className="relative flex items-center">
                <span className="relative flex h-3 w-3">
                  {branch.is_active && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${branch.is_active ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}></span>
                </span>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                <Icon name="time" size={16} className="text-stone-400" />
                <span>{branch.timezone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                <Icon name="users" size={16} className="text-stone-400" />
                <span>Manage Staff</span>
              </div>
            </div>

            {canUpdate && (
              <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800/80 flex gap-2 relative z-10">
                <button 
                  onClick={() => openEditModal(branch)}
                  className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Edit Details
                </button>
                <button className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-lg transition-colors">
                  Settings
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm font-medium text-stone-500 text-center mt-12">
        <Link to="/" className="inline-flex items-center gap-2 hover:text-brand-600 transition-colors">
          <Icon name="arrowLeft" size={16} /> Back to Dashboard
        </Link>
      </p>

      <BranchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        branchToEdit={branchToEdit} 
      />
    </div>
  );
}