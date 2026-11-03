import type { IconName } from '@/components/icons/Icon';

/**
 * Central navigation + role-routing config (foundation §10).
 *
 * One source of truth for: the role-scoped sidebar (AppShell), the dashboard
 * tiles (DashboardPage), and the post-login landing route (role -> home).
 *
 * Items are gated by RBAC permission (matched against `user.permissions`).
 * Routes that do not exist yet point at the station board they map to, so the
 * link is never dead — e.g. Pharmacy -> the PHA queue board.
 */

export interface NavItem {
  /** Router path. */
  to: string;
  /** i18n key under the `nav` namespace. */
  key: string;
  /** Glyph from the central Icon registry. */
  icon: IconName;
  /**
   * Permission required to see this item. Omit for items everyone signed-in
   * may see (e.g. the dashboard). When set, matched against user.permissions.
   */
  permission?: string;
  /** Hide this item when the signed-in user has any of these roles. */
  hiddenForRoles?: string[];
  /** Show this item only when the signed-in user has at least one of these roles. */
  onlyRoles?: string[];
  /** Exact-match active state (used for the root dashboard link). */
  end?: boolean;
  /** Sidebar group this item belongs to. */
  section: NavSection;
}

export type NavSection = 'workspace' | 'frontDesk' | 'clinical' | 'diagnostics' | 'finance' | 'administration';

/** Sidebar groups in display order; labels live under `nav:section_<id>`. */
export const NAV_SECTIONS: NavSection[] = ['workspace', 'frontDesk', 'clinical', 'diagnostics', 'finance', 'administration'];

/**
 * Primary navigation, ordered along the patient journey:
 * intake -> clinical -> diagnostics -> dispensing -> money -> back-office.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', key: 'nav:dashboard', icon: 'dashboard', end: true, section: 'workspace' },
  { to: '/profile', key: 'nav:profile', icon: 'user', hiddenForRoles: ['patient'], section: 'workspace' },

  // Intake / front desk
  { to: '/queue/check-in', key: 'nav:checkIn', icon: 'plus', permission: 'visits.create', hiddenForRoles: ['superadmin'], section: 'frontDesk' },
  { to: '/queue', key: 'nav:queue', icon: 'queue', permission: 'queue.read', hiddenForRoles: ['superadmin'], section: 'frontDesk' },
  { to: '/queue/board/TRI', key: 'nav:triage', icon: 'triage', permission: 'triage.create', hiddenForRoles: ['superadmin'], section: 'clinical' },
  { to: '/patients', key: 'nav:patients', icon: 'patients', permission: 'patients.read', hiddenForRoles: ['superadmin'], section: 'frontDesk' },
  { to: '/appointments', key: 'nav:appointments', icon: 'calendar', permission: 'appointments.list', hiddenForRoles: ['superadmin'], section: 'frontDesk' },
  { to: '/messages', key: 'nav:messages', icon: 'message', onlyRoles: ['hospital-admin', 'receptionist', 'doctor'], section: 'workspace' },

  // Clinical
  { to: '/queue/board/DOC', key: 'nav:emr', icon: 'emr', permission: 'emr.read', hiddenForRoles: ['superadmin'], section: 'clinical' },

  // Diagnostics & dispensing
  { to: '/queue/board/LAB', key: 'nav:laboratory', icon: 'laboratory', permission: 'lab.read', hiddenForRoles: ['superadmin'], section: 'diagnostics' },
  { to: '/queue/board/RAD', key: 'nav:radiology', icon: 'radiology', permission: 'radiology.read', hiddenForRoles: ['superadmin'], section: 'diagnostics' },
  { to: '/queue/board/PHA', key: 'nav:pharmacy', icon: 'pharmacy', permission: 'pharmacy.read', hiddenForRoles: ['superadmin'], section: 'diagnostics' },

  // Money
  { to: '/queue/board/BIL', key: 'nav:billing', icon: 'billing', permission: 'invoices.read', hiddenForRoles: ['superadmin'], section: 'finance' },

  // Back office
  { to: '/inventory', key: 'nav:inventory', icon: 'inventory', permission: 'inventory.read', hiddenForRoles: ['superadmin'], section: 'administration' },
  { to: '/admin/staff', key: 'nav:staff', icon: 'users', permission: 'staff.update', section: 'administration' },
  { to: '/reports', key: 'nav:reports', icon: 'reports', permission: 'reporting.read', section: 'administration' },
  { to: '/branches', key: 'nav:branches', icon: 'branches', permission: 'branches.read', section: 'administration' },
  { to: '/audit', key: 'nav:audit', icon: 'audit', permission: 'audit.read', section: 'administration' },
  { to: '/settings', key: 'nav:settings', icon: 'settings', permission: 'settings.read', section: 'administration' },
];

/**
 * Role -> landing route after login. The first role the user holds (in the
 * priority order below) wins, so a doctor who is also an admin still lands on
 * the clinical board they use day to day.
 */
const ROLE_HOME: Record<string, string> = {
  superadmin: '/',
  'hospital-admin': '/',
  doctor: '/queue/board/DOC',
  nurse: '/queue/board/TRI',
  receptionist: '/queue/check-in',
  'records-officer': '/patients',
  pharmacist: '/queue/board/PHA',
  'lab-technician': '/queue/board/LAB',
  radiologist: '/queue/board/RAD',
  cashier: '/queue/board/BIL',
  patient: '/portal',
};

/** Priority order for resolving a home when a user holds multiple roles. */
const ROLE_PRIORITY: string[] = [
  'superadmin',
  'doctor',
  'nurse',
  'pharmacist',
  'lab-technician',
  'radiologist',
  'cashier',
  'receptionist',
  'records-officer',
  'hospital-admin',
  'patient',
];

/**
 * Resolve the post-login landing route for a user's roles. Falls back to the
 * dashboard when no role matches (e.g. a custom role with no mapping yet).
 */
export function resolveHomeRoute(roles: readonly string[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role) && ROLE_HOME[role] !== undefined) {
      return ROLE_HOME[role];
    }
  }

  return '/';
}

export function isNavItemVisible(
  item: NavItem,
  roles: readonly string[],
  hasPermission: (permission: string) => boolean,
): boolean {
  if (item.onlyRoles !== undefined && !item.onlyRoles.some((role) => roles.includes(role))) {
    return false;
  }

  if (item.hiddenForRoles !== undefined && item.hiddenForRoles.some((role) => roles.includes(role))) {
    return false;
  }

  return item.permission === undefined || hasPermission(item.permission);
}
