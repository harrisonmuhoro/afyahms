import type { ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';

export interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;
  anyPermission?: string[];
  explanation?: string;
}

export function PermissionButton({
  permission,
  anyPermission,
  explanation,
  disabled,
  onClick,
  className,
  children,
  ...rest
}: PermissionButtonProps): JSX.Element {
  const { hasPermission, hasAnyPermission } = useAuth();
  const { t } = useTranslation(['errors']);

  const allowed =
    (permission === undefined || hasPermission(permission)) &&
    (anyPermission === undefined || anyPermission.length === 0 || hasAnyPermission(anyPermission));

  if (!allowed) {
    const message = explanation ?? t('errors:forbidden');

    return (
      <button
        {...rest}
        className={className}
        disabled
        aria-disabled
        title={message}
        aria-label={message}
      >
        {children}
      </button>
    );
  }

  return (
    <button {...rest} className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
