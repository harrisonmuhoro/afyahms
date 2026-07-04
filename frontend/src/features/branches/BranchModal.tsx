import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@/components/icons/Icon';
import { httpClient } from '@/lib/http';
import { useBranches } from './BranchProvider';
import type { Branch } from './BranchProvider';

const branchSchema = z.object({
  code: z.string().min(2).max(8).regex(/^[A-Z]{2,8}$/, 'Code must be 2-8 uppercase letters'),
  name: z.string().min(1, 'Name is required').max(255),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  timezone: z.string().max(64).default('Africa/Nairobi'),
  currency: z.string().length(3).default('KES'),
  is_active: z.boolean().default(true),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit?: Branch | null;
}

export function BranchModal({ isOpen, onClose, branchToEdit }: BranchModalProps): JSX.Element | null {
  const { refresh } = useBranches();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      code: '',
      name: '',
      timezone: 'Africa/Nairobi',
      currency: 'KES',
      is_active: true,
      address: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (branchToEdit) {
        reset({
          code: branchToEdit.code,
          name: branchToEdit.name,
          timezone: branchToEdit.timezone,
          currency: branchToEdit.currency,
          is_active: branchToEdit.is_active,
          address: branchToEdit.address || '',
          phone: branchToEdit.phone || '',
          email: branchToEdit.email || '',
        });
      } else {
        reset({
          code: '',
          name: '',
          timezone: 'Africa/Nairobi',
          currency: 'KES',
          is_active: true,
          address: '',
          phone: '',
          email: '',
        });
      }
    }
  }, [isOpen, branchToEdit, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: BranchFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      if (branchToEdit) {
        await httpClient.patch(`/branches/${branchToEdit.id}`, data);
      } else {
        await httpClient.post('/branches', data);
      }
      refresh();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to save branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">
            {branchToEdit ? 'Edit Branch' : 'Add New Branch'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Branch Code</label>
              <input
                {...register('code')}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                placeholder="e.g. NAI"
              />
              {errors.code && <p className="text-xs text-rose-500">{errors.code.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Name</label>
              <input
                {...register('name')}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                placeholder="e.g. Nairobi HQ"
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Email Address</label>
            <input
              {...register('email')}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              placeholder="e.g. info@nairobi-branch.com"
            />
            {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
            <input
              {...register('phone')}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Timezone</label>
              <input
                {...register('timezone')}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>
            <div className="space-y-1 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  className="w-4 h-4 text-brand-600 rounded border-stone-300 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Active Branch</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
