import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageLoader } from '@/components/feedback/PageLoader';

// ─── Always-eager (tiny auth/layout shells — needed immediately) ────────────
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { NotFoundPage } from '@/components/feedback/NotFoundPage';

// ─── Auth (small, load eagerly so login is instant) ──────────────────────────
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage';
import { LoginScreen } from '@/features/auth/LoginScreen';

// ─── Lazy page chunks (each becomes its own async JS chunk) ──────────────────

// Profile completion
const CompleteProfilePage = lazy(() =>
  import('@/features/auth/CompleteProfilePage').then((m) => ({ default: m.CompleteProfilePage })),
);

// Patient portal shell + pages
const PortalShell = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalShell })),
);
const PortalHome = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalHome })),
);
const PortalProfile = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalProfile })),
);
const PortalAppointments = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalAppointments })),
);
const PortalRecords = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalRecords })),
);
const PortalResults = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalResults })),
);
const PortalBills = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalBills })),
);
const PortalMessages = lazy(() =>
  import('@/features/portal').then((m) => ({ default: m.PortalMessages })),
);

// Public board (display screen)
const PublicQueueBoard = lazy(() =>
  import('@/features/dashboard/PublicQueueBoard').then((m) => ({ default: m.PublicQueueBoard })),
);

// Dashboards
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const DoctorDashboard = lazy(() =>
  import('@/features/dashboard/DoctorDashboard').then((m) => ({ default: m.DoctorDashboard })),
);
const ReceptionistDashboard = lazy(() =>
  import('@/features/dashboard/ReceptionistDashboard').then((m) => ({ default: m.ReceptionistDashboard })),
);
const NurseDashboard = lazy(() =>
  import('@/features/dashboard/NurseDashboard').then((m) => ({ default: m.NurseDashboard })),
);
const PharmacistDashboard = lazy(() =>
  import('@/features/dashboard/PharmacistDashboard').then((m) => ({ default: m.PharmacistDashboard })),
);
const BillingDashboard = lazy(() =>
  import('@/features/dashboard/BillingDashboard').then((m) => ({ default: m.BillingDashboard })),
);
const LabDashboard = lazy(() =>
  import('@/features/dashboard/LabDashboard').then((m) => ({ default: m.LabDashboard })),
);
const InventoryDashboard = lazy(() =>
  import('@/features/dashboard/InventoryDashboard').then((m) => ({ default: m.InventoryDashboard })),
);
const RadiologistDashboard = lazy(() =>
  import('@/features/dashboard/RadiologistDashboard').then((m) => ({ default: m.RadiologistDashboard })),
);
const RecordsDashboard = lazy(() =>
  import('@/features/dashboard/RecordsDashboard').then((m) => ({ default: m.RecordsDashboard })),
);
const SuperadminDashboard = lazy(() =>
  import('@/features/dashboard/SuperadminDashboard').then((m) => ({ default: m.SuperadminDashboard })),
);
const SystemSettings = lazy(() =>
  import('@/features/dashboard/SystemSettings').then((m) => ({ default: m.SystemSettings })),
);
const PatientPortal = lazy(() =>
  import('@/features/dashboard/PatientPortal').then((m) => ({ default: m.PatientPortal })),
);

// Admin
const BranchesPage = lazy(() =>
  import('@/features/branches/BranchesPage').then((m) => ({ default: m.BranchesPage })),
);
const AdminStaffPage = lazy(() =>
  import('@/features/admin-staff/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })),
);
const StaffProfilePage = lazy(() =>
  import('@/features/profile/StaffProfilePage').then((m) => ({ default: m.StaffProfilePage })),
);

// Patients
const PatientsPage = lazy(() =>
  import('@/features/patients/PatientsPage').then((m) => ({ default: m.PatientsPage })),
);
const PatientDetailPage = lazy(() =>
  import('@/features/patients/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })),
);
const NewPatientPage = lazy(() =>
  import('@/features/patients/NewPatientPage').then((m) => ({ default: m.NewPatientPage })),
);

// Queue
const QueueIndexPage = lazy(() =>
  import('@/features/queue/QueueIndexPage').then((m) => ({ default: m.QueueIndexPage })),
);
const BoardPage = lazy(() =>
  import('@/features/queue/BoardPage').then((m) => ({ default: m.BoardPage })),
);
const CheckInPage = lazy(() =>
  import('@/features/queue/CheckInPage').then((m) => ({ default: m.CheckInPage })),
);

// Clinical
const TriagePage = lazy(() =>
  import('@/features/triage/TriagePage').then((m) => ({ default: m.TriagePage })),
);
const EncounterPage = lazy(() =>
  import('@/features/emr/EncounterPage').then((m) => ({ default: m.EncounterPage })),
);

// Pharmacy
const PharmacyDashboard = lazy(() =>
  import('@/features/pharmacy/PharmacyDashboard').then((m) => ({ default: m.PharmacyDashboard })),
);
const MedicationsPage = lazy(() =>
  import('@/features/pharmacy/MedicationsPage').then((m) => ({ default: m.MedicationsPage })),
);
const PrescriptionsPage = lazy(() =>
  import('@/features/pharmacy/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })),
);

// Inventory
const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);

// Audit & Settings
const AuditLogPage = lazy(() =>
  import('@/features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const AppointmentsCalendarPage = lazy(() =>
  import('@/features/appointments').then((m) => ({ default: m.AppointmentsCalendarPage })),
);

// Reports (one chunk — all report components share the recharts dependency)
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const RevenueSummaryReport = lazy(() =>
  import('@/features/reports/RevenueSummaryReport').then((m) => ({ default: m.RevenueSummaryReport })),
);
const PaymentsCollectedReport = lazy(() =>
  import('@/features/reports/PaymentsCollectedReport').then((m) => ({ default: m.PaymentsCollectedReport })),
);
const OutstandingInvoicesReport = lazy(() =>
  import('@/features/reports/OutstandingInvoicesReport').then((m) => ({ default: m.OutstandingInvoicesReport })),
);
const ShaClaimsReport = lazy(() =>
  import('@/features/reports/ShaClaimsReport').then((m) => ({ default: m.ShaClaimsReport })),
);
const DiagnosesSummaryReport = lazy(() =>
  import('@/features/reports/DiagnosesSummaryReport').then((m) => ({ default: m.DiagnosesSummaryReport })),
);
const PatientEncountersReport = lazy(() =>
  import('@/features/reports/PatientEncountersReport').then((m) => ({ default: m.PatientEncountersReport })),
);
const PrescriptionsIssuedReport = lazy(() =>
  import('@/features/reports/PrescriptionsIssuedReport').then((m) => ({ default: m.PrescriptionsIssuedReport })),
);
const LabResultsReport = lazy(() =>
  import('@/features/reports/LabResultsReport').then((m) => ({ default: m.LabResultsReport })),
);
const QueueThroughputReport = lazy(() =>
  import('@/features/reports/QueueThroughputReport').then((m) => ({ default: m.QueueThroughputReport })),
);
const WaitTimesReport = lazy(() =>
  import('@/features/reports/WaitTimesReport').then((m) => ({ default: m.WaitTimesReport })),
);
const PatientVolumeReport = lazy(() =>
  import('@/features/reports/PatientVolumeReport').then((m) => ({ default: m.PatientVolumeReport })),
);
const AppointmentStatisticsReport = lazy(() =>
  import('@/features/reports/AppointmentStatisticsReport').then((m) => ({ default: m.AppointmentStatisticsReport })),
);
const StockLevelsReport = lazy(() =>
  import('@/features/reports/StockLevelsReport').then((m) => ({ default: m.StockLevelsReport })),
);
const ExpiringItemsReport = lazy(() =>
  import('@/features/reports/ExpiringItemsReport').then((m) => ({ default: m.ExpiringItemsReport })),
);
const StockConsumptionReport = lazy(() =>
  import('@/features/reports/StockConsumptionReport').then((m) => ({ default: m.StockConsumptionReport })),
);

/**
 * Route permission matrix (docs/08-rbac-matrix.md):
 *
 *  /portal/**           → portal.access        (patient only)
 *  /patients/**         → patients.read         (all staff except patient)
 *  /queue/**            → queue.read            (all staff except records-officer & patient)
 *  /queue/check-in      → visits.create         (receptionist, nurse, doctor, admin)
 *  /queue/triage/:id    → triage.create         (nurse, doctor)
 *  /emr/**              → emr.read              (doctor, nurse, admin)
 *  /pharmacy/**         → pharmacy.read         (pharmacist, doctor, admin)
 *  /inventory           → inventory.read        (pharmacist, nurse, lab, admin)
 *  /reports             → reporting.read        (admin)
 *  /branches            → branches.read         (all staff)
 *  /audit               → audit.read            (admin)
 *  /settings            → settings.read         (admin)
 */
export function App(): JSX.Element {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login-screen" element={<LoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/public-queue-board" element={<PublicQueueBoard />} />

        {/* Profile Completion */}
        <Route
          path="/patient/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ─── Patient Portal (own-data only, separate shell) ─────────────── */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute permission="portal.access">
              <PortalShell />
            </ProtectedRoute>
          }
        >
          {/* Home & Appointments are part of base portal.access */}
          <Route index element={<PortalHome />} />
          <Route path="profile" element={<PortalProfile />} />
          <Route path="appointments" element={<PortalAppointments />} />
          <Route path="records" element={<PortalRecords />} />

          {/* Lab/Radiology results require portal.view-results */}
          <Route
            path="results"
            element={
              <ProtectedRoute permission="portal.view-results">
                <PortalResults />
              </ProtectedRoute>
            }
          />

          {/* Bills requires portal.view-invoices OR portal.pay */}
          <Route
            path="bills"
            element={
              <ProtectedRoute anyPermission={['portal.view-invoices', 'portal.pay']}>
                <PortalBills />
              </ProtectedRoute>
            }
          />

          {/* Messaging uses portal.access (base) */}
          <Route path="messages" element={<PortalMessages />} />
        </Route>

        {/* ─── Staff App (shared AppShell) ────────────────────────────────── */}
        <Route
          path="/"
          element={
            // Any authenticated non-patient user can reach the shell itself;
            // individual pages carry their own permission guards below.
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Dashboard — visible to all authenticated staff */}
          <Route index element={<DashboardPage />} />

          {/* Dashboards preview */}
          <Route path="doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="receptionist-dashboard" element={<ReceptionistDashboard />} />
          <Route path="nurse-dashboard" element={<NurseDashboard />} />
          <Route path="pharmacist-dashboard" element={<PharmacistDashboard />} />
          <Route path="billing-dashboard" element={<BillingDashboard />} />
          <Route path="inventory-dashboard" element={<InventoryDashboard />} />
          <Route path="lab-dashboard" element={<LabDashboard />} />
          <Route path="radiologist-dashboard" element={<RadiologistDashboard />} />
          <Route path="records-dashboard" element={<RecordsDashboard />} />
          <Route path="superadmin-dashboard" element={<SuperadminDashboard />} />
          <Route path="system-settings" element={<SystemSettings />} />
          <Route path="patient-portal" element={<PatientPortal />} />

          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <StaffProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin/staff"
            element={
              <ProtectedRoute permission="staff.update">
                <AdminStaffPage />
              </ProtectedRoute>
            }
          />

          {/* Branches — all staff can read branch info (branches.read) */}
          <Route
            path="branches"
            element={
              <ProtectedRoute permission="branches.read">
                <BranchesPage />
              </ProtectedRoute>
            }
          />

          {/* Patients — receptionist, records-officer, doctor, nurse, admin, etc. */}
          <Route
            path="patients"
            element={
              <ProtectedRoute permission="patients.read">
                <PatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="patients/new"
            element={
              <ProtectedRoute permission="patients.create">
                <NewPatientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="patients/:uuid"
            element={
              <ProtectedRoute permission="patients.read">
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Appointments — reception, doctors, admin */}
          <Route
            path="appointments"
            element={
              <ProtectedRoute permission="visits.create">
                <AppointmentsCalendarPage />
              </ProtectedRoute>
            }
          />

          {/* Queue index — all staff with queue.read */}
          <Route
            path="queue"
            element={
              <ProtectedRoute permission="queue.read">
                <QueueIndexPage />
              </ProtectedRoute>
            }
          />

          {/* Check-in — requires visits.create (receptionist, nurse, doctor, admin) */}
          <Route
            path="queue/check-in"
            element={
              <ProtectedRoute permission="visits.create">
                <CheckInPage />
              </ProtectedRoute>
            }
          />

          {/* Board — any station, gated by queue.read */}
          <Route
            path="queue/board/:code"
            element={
              <ProtectedRoute permission="queue.read">
                <BoardPage />
              </ProtectedRoute>
            }
          />

          {/* Triage — nurse or doctor (triage.create) */}
          <Route
            path="queue/triage/:visitId"
            element={
              <ProtectedRoute permission="triage.create">
                <TriagePage />
              </ProtectedRoute>
            }
          />

          {/* EMR / SOAP — doctor, nurse, admin (emr.read at minimum to open) */}
          <Route
            path="emr/encounter/:visitId"
            element={
              <ProtectedRoute permission="emr.read">
                <EncounterPage />
              </ProtectedRoute>
            }
          />

          {/* Pharmacy — pharmacist, doctor, admin */}
          <Route
            path="pharmacy"
            element={
              <ProtectedRoute permission="pharmacy.read">
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="pharmacy/medications"
            element={
              <ProtectedRoute permission="pharmacy.manage-catalog">
                <MedicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="pharmacy/prescriptions"
            element={
              <ProtectedRoute permission="prescriptions.read">
                <PrescriptionsPage />
              </ProtectedRoute>
            }
          />

          {/* Inventory — admin, pharmacist, nurse, lab */}
          <Route
            path="inventory"
            element={
              <ProtectedRoute permission="inventory.read">
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          {/* Reports — admin only (reporting.read) */}
          <Route
            path="reports"
            element={
              <ProtectedRoute permission="reporting.read">
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/financial/revenue-summary"
            element={
              <ProtectedRoute permission="reporting.read">
                <RevenueSummaryReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/financial/payments-collected"
            element={
              <ProtectedRoute permission="reporting.read">
                <PaymentsCollectedReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/financial/outstanding-invoices"
            element={
              <ProtectedRoute permission="reporting.read">
                <OutstandingInvoicesReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/financial/sha-claims"
            element={
              <ProtectedRoute permission="reporting.read">
                <ShaClaimsReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/clinical/diagnoses-summary"
            element={
              <ProtectedRoute permission="reporting.read">
                <DiagnosesSummaryReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/clinical/patient-encounters"
            element={
              <ProtectedRoute permission="reporting.read">
                <PatientEncountersReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/clinical/prescriptions-issued"
            element={
              <ProtectedRoute permission="reporting.read">
                <PrescriptionsIssuedReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/clinical/lab-results"
            element={
              <ProtectedRoute permission="reporting.read">
                <LabResultsReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/operational/queue-throughput"
            element={
              <ProtectedRoute permission="reporting.read">
                <QueueThroughputReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/operational/wait-times"
            element={
              <ProtectedRoute permission="reporting.read">
                <WaitTimesReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/operational/patient-volume"
            element={
              <ProtectedRoute permission="reporting.read">
                <PatientVolumeReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/operational/appointment-statistics"
            element={
              <ProtectedRoute permission="reporting.read">
                <AppointmentStatisticsReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/inventory/stock-levels"
            element={
              <ProtectedRoute permission="reporting.read">
                <StockLevelsReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/inventory/expiring-items"
            element={
              <ProtectedRoute permission="reporting.read">
                <ExpiringItemsReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/inventory/stock-consumption"
            element={
              <ProtectedRoute permission="reporting.read">
                <StockConsumptionReport />
              </ProtectedRoute>
            }
          />

          {/* Audit — admin only */}
          <Route
            path="audit"
            element={
              <ProtectedRoute permission="audit.read">
                <AuditLogPage />
              </ProtectedRoute>
            }
          />

          {/* Settings — admin only */}
          <Route
            path="settings"
            element={
              <ProtectedRoute permission="settings.read">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
