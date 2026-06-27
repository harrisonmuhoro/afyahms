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
  /** Exact-match active state (used for the root dashboard link). */
  end?: boolean;
}

/**
 * Primary navigation, ordered along the patient journey:
 * intake -> clinical -> diagnostics -> dispensing -> money -> back-office.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', key: 'nav:dashboard', icon: 'dashboard', end: true },

  // Intake / front desk
  { to: '/queue/check-in', key: 'nav:checkIn', icon: 'plus', permission: 'visits.create' },
  { to: '/queue', key: 'nav:queue', icon: 'queue', permission: 'queue.read' },
  { to: '/queue/board/TRI', key: 'nav:triage', icon: 'triage', permission: 'triage.create' },
  { to: '/patients', key: 'nav:patients', icon: 'patients', permission: 'patients.read' },

  // Clinical
  { to: '/queue/board/DOC', key: 'nav:emr', icon: 'emr', permission: 'emr.read' },

  // Diagnostics & dispensing
  { to: '/queue/board/LAB', key: 'nav:laboratory', icon: 'laboratory', permission: 'lab.read' },
  { to: '/queue/board/RAD', key: 'nav:radiology', icon: 'radiology', permission: 'radiology.read' },
  { to: '/queue/board/PHA', key: 'nav:pharmacy', icon: 'pharmacy', permission: 'pharmacy.read' },

  // Money
  { to: '/queue/board/BIL', key: 'nav:billing', icon: 'billing', permission: 'invoices.read' },

  // Back office
  { to: '/inventory', key: 'nav:inventory', icon: 'inventory', permission: 'inventory.read' },
  { to: '/reports', key: 'nav:reports', icon: 'reports', permission: 'reporting.read' },
  { to: '/branches', key: 'nav:branches', icon: 'branches', permission: 'branches.read' },
  { to: '/audit', key: 'nav:audit', icon: 'audit', permission: 'audit.read' },
  { to: '/settings', key: 'nav:settings', icon: 'settings', permission: 'settings.read' },
];

/**
 * Role -> landing route after login. The first role the user holds (in the
 * priority order below) wins, so a doctor who is also an admin still lands on
 * the clinical board they use day to day.
 */
const ROLE_HOME: Record<string, string> = {
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
