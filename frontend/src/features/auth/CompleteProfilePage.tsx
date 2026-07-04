import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient, HttpError } from '@/lib/http';
import { useAuth } from './AuthProvider';
import { Icon } from '@/components/icons/Icon';
import type { Branch } from '@/features/branches/BranchProvider';

export function CompleteProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Form payload
  const [homeBranchId, setHomeBranchId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('unknown');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [county, setCounty] = useState('');
  const [subCounty, setSubCounty] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nextOfKinName, setNextOfKinName] = useState('');
  const [nextOfKinPhone, setNextOfKinPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');

  useEffect(() => {
    // If the profile is already complete, send them to the portal
    if (user?.profile_complete) {
      navigate('/portal', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await httpClient.get<{ data: Branch[] } | Branch[]>('/branches');
        const data = Array.isArray(res) ? res : res.data;
        setBranches(data);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    };
    void fetchBranches();
  }, []);

  const calculateAge = (dobString: string): number => {
    const dob = new Date(dobString);
    const diff = Date.now() - dob.getTime();
    const age = new Date(diff);
    return Math.abs(age.getUTCFullYear() - 1970);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!homeBranchId) {
        setError('Please select a preferred clinic branch.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!firstName || !lastName || !dateOfBirth) {
        setError('First Name, Last Name, and Date of Birth are required.');
        return;
      }
      const age = calculateAge(dateOfBirth);
      if (age < 18) {
        setStep(3); // Minor, require guardian info
      } else {
        void submitProfile();
      }
    }
  };

  const submitProfile = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await httpClient.post('/auth/google/complete-profile', {
        home_branch_id: homeBranchId,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        gender,
        date_of_birth: dateOfBirth,
        county,
        sub_county: subCounty,
        national_id: nationalId,
        phone,
        address,
        next_of_kin_name: nextOfKinName,
        next_of_kin_phone: nextOfKinPhone,
        guardian_name: guardianName,
        guardian_national_id: guardianId,
        guardian_relationship: guardianRelationship,
      });

      await refreshUser();
      navigate('/portal', { replace: true });
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message || 'Failed to complete profile.');
      } else {
        setError('An unexpected error occurred.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 dark:bg-stone-950">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-6 dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
            <Icon name="heartPulse" size={22} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <span className="block text-lg font-bold text-stone-900 dark:text-white">Afya HMS</span>
            <span className="block text-[11px] font-medium tracking-wider text-teal-600 dark:text-teal-400 uppercase">
              Patient Portal
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800 sm:p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Complete Your Profile</h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              We need a few more details before you can access the patient portal.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <Icon name="alertCircle" size={16} className="mt-0.5 shrink-0 text-red-500" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Select Preferred Clinic</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {loadingBranches ? (
                  <p className="text-sm text-stone-500">Loading clinics...</p>
                ) : (
                  branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => setHomeBranchId(branch.id)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition ${
                        homeBranchId === branch.id
                          ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-900/20'
                          : 'border-stone-200 hover:border-teal-300 dark:border-stone-800 dark:hover:border-teal-700'
                      }`}
                    >
                      <span className="font-semibold text-stone-900 dark:text-white">{branch.name}</span>
                      <span className="mt-1 text-sm text-stone-500">{branch.address || 'No address provided'}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={handleNext} disabled={!homeBranchId} className="btn-primary">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }}
              className="animate-fade-in space-y-6"
            >
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Personal Details</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">First Name *</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Middle Name</label>
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Last Name *</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Date of Birth *</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="input">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unknown">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">National ID</label>
                  <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Address</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">County</label>
                  <input type="text" value={county} onChange={(e) => setCounty(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Sub-County</label>
                  <input type="text" value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="input" />
                </div>
                <div className="sm:col-span-2 mt-2 border-t border-stone-200 dark:border-stone-800 pt-4">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-4">Emergency Contact (Next of Kin)</h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Name</label>
                      <input type="text" value={nextOfKinName} onChange={(e) => setNextOfKinName(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
                      <input type="tel" value={nextOfKinPhone} onChange={(e) => setNextOfKinPhone(e.target.value)} className="input" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
                <button type="submit" className="btn-primary">Next Step</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={submitProfile} className="animate-fade-in space-y-6">
              <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                <span className="font-semibold">Minor detected:</span> Since you are under 18, we require guardian details to proceed.
              </div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Guardian Details</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Guardian Name *</label>
                  <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Guardian ID *</label>
                  <input type="text" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} required className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Relationship *</label>
                  <select value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)} required className="input">
                    <option value="">Select...</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="relative">Other Relative</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(2)} disabled={submitting} className="btn-secondary">Back</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Complete Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
