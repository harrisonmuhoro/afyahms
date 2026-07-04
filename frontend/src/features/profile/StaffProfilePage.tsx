import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Icon } from '@/components/icons/Icon';
import { useAuth } from '@/features/auth/AuthProvider';
import { HttpError } from '@/lib/http';
import {
  useRequestContactChange,
  useStaffProfile,
  useUpdateBasicProfile,
  useUpdateStaffPassword,
  useUploadProfilePhoto,
  useVerifyContactChange,
  type ContactChangePayload,
} from './api';

function toast(title: string, variant: 'info' | 'success' | 'error' = 'info'): void {
  window.dispatchEvent(new CustomEvent('afya:toast', { detail: { title, variant } }));
}

function errorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const firstDetail = Object.values(err.details ?? {})[0]?.[0];

    return firstDetail ?? err.message;
  }

  return 'Something went wrong. Please try again.';
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function StaticRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}

export function StaffProfilePage(): JSX.Element {
  const { user, refreshUser, startMfaEnrollment, verifyMfaEnrollment, disableMfa } = useAuth();
  const { profile, isLoading } = useStaffProfile();
  const updateBasic = useUpdateBasicProfile();
  const requestContact = useRequestContactChange();
  const verifyContact = useVerifyContactChange();
  const updatePassword = useUpdateStaffPassword();
  const uploadPhoto = useUploadProfilePhoto();
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({
    name: '',
    phone: '',
    address: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    locale: 'en',
    current_password: '',
  });
  const [contactForm, setContactForm] = useState<ContactChangePayload>({
    field: 'email',
    new_value: '',
    current_password: '',
  });
  const [verification, setVerification] = useState({ field: 'email' as 'email' | 'phone', token: '' });
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [mfaType, setMfaType] = useState<'totp' | 'email'>('totp');
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string | null; qr_url: string | null; recovery_codes: string[]; message: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [disableMfaPassword, setDisableMfaPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const activeUser = profile?.user ?? user;

  useEffect(() => {
    if (activeUser === null) {
      return;
    }

    setBasicForm({
      name: activeUser.name ?? '',
      phone: activeUser.phone ?? '',
      address: activeUser.address ?? '',
      next_of_kin_name: activeUser.next_of_kin_name ?? '',
      next_of_kin_phone: activeUser.next_of_kin_phone ?? '',
      locale: activeUser.locale ?? 'en',
      current_password: '',
    });
  }, [activeUser]);

  const employment = profile?.employment;
  const pendingText = useMemo(() => {
    if (profile === null || profile.pending_contact_changes.length === 0) {
      return null;
    }

    return profile.pending_contact_changes
      .map((change) => `${change.field}: ${change.new_value}`)
      .join(', ');
  }, [profile]);

  const handleBasicSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      const response = await updateBasic.mutateAsync({
        name: basicForm.name,
        phone: basicForm.phone || null,
        address: basicForm.address || null,
        next_of_kin_name: basicForm.next_of_kin_name || null,
        next_of_kin_phone: basicForm.next_of_kin_phone || null,
        locale: basicForm.locale,
        current_password: basicForm.current_password,
      });
      setLastUpdated(response.updated_at);
      setIsEditingBasic(false);
      setBasicForm((current) => ({ ...current, current_password: '' }));
      await refreshUser();
      toast(`Profile updated on ${new Date(response.updated_at).toLocaleString()}`, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      const response = await requestContact.mutateAsync(contactForm);
      setVerification({ field: contactForm.field, token: '' });
      setDebugToken(response.debug_verification_token ?? null);
      setContactForm({ field: contactForm.field, new_value: '', current_password: '' });
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      const response = await verifyContact.mutateAsync(verification);
      await refreshUser();
      setVerification((current) => ({ ...current, token: '' }));
      setDebugToken(null);
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (passwordForm.password !== passwordForm.password_confirmation) {
      toast('New password and confirmation do not match.', 'error');
      return;
    }

    try {
      const response = await updatePassword.mutateAsync(passwordForm);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }

    try {
      const response = await uploadPhoto.mutateAsync(file);
      await refreshUser();
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleStartMfa = async (): Promise<void> => {
    setIsEnrollingMfa(true);
    try {
      const response = await startMfaEnrollment(mfaType);
      setMfaSetupData(response);
      toast(response.message, 'info');
    } catch (err) {
      toast(errorMessage(err), 'error');
      setIsEnrollingMfa(false);
    }
  };

  const handleVerifyMfa = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      await verifyMfaEnrollment(mfaCode);
      setMfaSetupData(null);
      setMfaCode('');
      setIsEnrollingMfa(false);
      toast('MFA has been successfully enabled.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleDisableMfa = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      await disableMfa(disableMfaPassword);
      setDisableMfaPassword('');
      toast('MFA has been disabled.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (isLoading || activeUser === null) {
    return <div className="text-sm text-stone-500">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="avatar-lg h-14 w-14 text-lg">{initials(activeUser.name)}</div>
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="mt-1 text-sm text-stone-500">{activeUser.email}</p>
          </div>
        </div>
        <label className="btn-secondary cursor-pointer">
          <Icon name="user" size={16} />
          <span>{uploadPhoto.isPending ? 'Uploading...' : 'Change photo'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
        </label>
      </header>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Personal Information</h2>
            {lastUpdated !== null && (
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Profile updated on {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={() => setIsEditingBasic((current) => !current)}>
            <Icon name={isEditingBasic ? 'close' : 'user'} size={16} />
            {isEditingBasic ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {!isEditingBasic ? (
          <dl className="mt-5 grid gap-x-8 divide-y divide-stone-100 dark:divide-stone-800 md:grid-cols-2 md:divide-y-0">
            <StaticRow label="Full name" value={activeUser.name} />
            <StaticRow label="Personal phone" value={activeUser.phone ?? 'Not recorded'} />
            <StaticRow label="Personal email" value={activeUser.email} />
            <StaticRow label="Home address" value={activeUser.address ?? 'Not recorded'} />
            <StaticRow label="Next of kin" value={activeUser.next_of_kin_name ?? 'Not recorded'} />
            <StaticRow label="Next of kin phone" value={activeUser.next_of_kin_phone ?? 'Not recorded'} />
          </dl>
        ) : (
          <form onSubmit={handleBasicSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Full name</span>
              <input className="input" value={basicForm.name} onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Personal phone</span>
              <input className="input" value={basicForm.phone} onChange={(e) => setBasicForm({ ...basicForm, phone: e.target.value })} />
            </label>
            <label className="block md:col-span-2">
              <span className="label">Home address</span>
              <input className="input" value={basicForm.address} onChange={(e) => setBasicForm({ ...basicForm, address: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Next of kin name</span>
              <input className="input" value={basicForm.next_of_kin_name} onChange={(e) => setBasicForm({ ...basicForm, next_of_kin_name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Next of kin phone</span>
              <input className="input" value={basicForm.next_of_kin_phone} onChange={(e) => setBasicForm({ ...basicForm, next_of_kin_phone: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Preferred language</span>
              <select className="input" value={basicForm.locale} onChange={(e) => setBasicForm({ ...basicForm, locale: e.target.value })}>
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Current password</span>
              <div className="relative">
                <input type={showPasswords ? 'text' : 'password'} required className="input pr-10" value={basicForm.current_password} onChange={(e) => setBasicForm({ ...basicForm, current_password: e.target.value })} autoComplete="current-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                  <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </label>
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="btn-primary" disabled={updateBasic.isPending}>
                <Icon name="check" size={16} />
                {updateBasic.isPending ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setIsEditingBasic(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Account & Security</h2>
        {pendingText !== null && <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">Pending verification: {pendingText}</p>}

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Change password</h3>
            <div className="relative">
              <input type={showPasswords ? 'text' : 'password'} required className="input w-full pr-10" placeholder="Current password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} autoComplete="current-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
            <div className="relative">
              <input type={showPasswords ? 'text' : 'password'} required className="input w-full pr-10" placeholder="New password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
            <div className="relative">
              <input type={showPasswords ? 'text' : 'password'} required className="input w-full pr-10" placeholder="Confirm new password" value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })} autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
            <button type="submit" className="btn-secondary" disabled={updatePassword.isPending}>
              <Icon name="lock" size={16} />
              {updatePassword.isPending ? 'Updating...' : 'Update password'}
            </button>
          </form>

          <div className="space-y-5">
            <form onSubmit={handleContactSubmit} className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Change login contact</h3>
              <select className="input" value={contactForm.field} onChange={(e) => setContactForm({ ...contactForm, field: e.target.value as 'email' | 'phone' })}>
                <option value="email">Login email</option>
              </select>
              <input required className="input" placeholder="New value" value={contactForm.new_value} onChange={(e) => setContactForm({ ...contactForm, new_value: e.target.value })} />
              <div className="relative">
                <input type={showPasswords ? 'text' : 'password'} required className="input w-full pr-10" placeholder="Current password" value={contactForm.current_password} onChange={(e) => setContactForm({ ...contactForm, current_password: e.target.value })} autoComplete="current-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                  <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
              <button type="submit" className="btn-secondary" disabled={requestContact.isPending}>
                <Icon name="mail" size={16} />
                {requestContact.isPending ? 'Sending...' : 'Send verification'}
              </button>
              {debugToken !== null && <p className="text-xs text-stone-500">Debug verification token: {debugToken}</p>}
            </form>

            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Verify pending contact change</h3>
              <select className="input" value={verification.field} onChange={(e) => setVerification({ ...verification, field: e.target.value as 'email' | 'phone' })}>
                <option value="email">Email token</option>
              </select>
              <input required className="input" placeholder="Verification token or OTP" value={verification.token} onChange={(e) => setVerification({ ...verification, token: e.target.value })} />
              <button type="submit" className="btn-secondary" disabled={verifyContact.isPending}>
                <Icon name="check" size={16} />
                {verifyContact.isPending ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Multi-Factor Authentication (MFA)</h3>
          {!activeUser.mfa_enabled ? (
            <div className="mt-3">
              {!isEnrollingMfa ? (
                <div className="space-y-3">
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    Secure your account by enabling Multi-Factor Authentication.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select className="input max-w-xs" value={mfaType} onChange={(e) => setMfaType(e.target.value as 'totp' | 'email')}>
                      <option value="totp">Authenticator App</option>
                      <option value="email">Email OTP</option>
                    </select>
                    <button type="button" className="btn-primary" onClick={handleStartMfa}>
                      Enable MFA
                    </button>
                  </div>
                </div>
              ) : mfaSetupData ? (
                <div className="space-y-4 rounded-md border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800">
                  <p className="text-sm text-stone-700 dark:text-stone-300">{mfaSetupData.message}</p>
                  
                  {mfaSetupData.qr_url && (
                    <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6">
                      <QRCodeSVG
                        value={mfaSetupData.qr_url}
                        size={192}
                        level="M"
                        includeMargin={true}
                      />
                      <p className="text-xs text-stone-500">Scan this QR code with your authenticator app</p>
                    </div>
                  )}

                  <form onSubmit={handleVerifyMfa} className="flex gap-2">
                    <input required className="input" placeholder="Enter verification code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
                    <button type="submit" className="btn-primary">Verify</button>
                    <button type="button" className="btn-secondary" onClick={() => { setIsEnrollingMfa(false); setMfaSetupData(null); }}>Cancel</button>
                  </form>

                  {mfaSetupData.recovery_codes && mfaSetupData.recovery_codes.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Recovery Codes</p>
                      <p className="mb-2 text-xs text-stone-500">Save these codes in a secure place. You can use them to log in if you lose access to your device or email.</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {mfaSetupData.recovery_codes.map((code) => (
                          <code key={code} className="rounded bg-stone-200 px-2 py-1 text-xs dark:bg-stone-700">{code}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-stone-500">Starting enrollment...</div>
              )}
            </div>
          ) : (
            <form onSubmit={handleDisableMfa} className="mt-3 flex flex-col items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">MFA is currently enabled</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Your account is secured with multi-factor authentication.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="relative">
                  <input type={showPasswords ? 'text' : 'password'} required className="input min-w-[200px] pr-10" placeholder="Current password" value={disableMfaPassword} onChange={(e) => setDisableMfaPassword(e.target.value)} autoComplete="current-password" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                    <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                </div>
                <button type="submit" className="btn-danger whitespace-nowrap">
                  Disable MFA
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Employment Information</h2>
        <dl className="mt-5 grid gap-x-8 divide-y divide-stone-100 dark:divide-stone-800 md:grid-cols-2 md:divide-y-0">
          <StaticRow label="Role" value={employment?.roles.join(', ') || activeUser.roles.join(', ') || 'Not assigned'} />
          <StaticRow label="Department" value={employment?.department ?? 'Not assigned'} />
          <StaticRow label="Employee ID" value={employment?.employee_number ?? 'Not assigned'} />
          <StaticRow label="Branch" value={employment?.branch?.name ?? activeUser.current_branch?.name ?? 'Not assigned'} />
          <StaticRow label="Account status" value={employment?.account_status ?? (activeUser.is_active ? 'active' : 'inactive')} />
        </dl>
        <p className="mt-4 text-sm text-stone-500">To update employment information, contact Hospital Administration.</p>
      </section>
    </div>
  );
}
