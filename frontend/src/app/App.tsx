import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage';
import { CompleteProfilePage } from '@/features/auth/CompleteProfilePage';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { PublicQueueBoard } from '@/features/dashboard/PublicQueueBoard';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DoctorDashboard } from '@/features/dashboard/DoctorDashboard';
import { ReceptionistDashboard } from '@/features/dashboard/ReceptionistDashboard';
import { NurseDashboard } from '@/features/dashboard/NurseDashboard';
import { PharmacistDashboard } from '@/features/dashboard/PharmacistDashboard';
import { BillingDashboard } from '@/features/dashboard/BillingDashboard';
import { LabDashboard } from '@/features/dashboard/LabDashboard';
import { InventoryDashboard } from '@/features/dashboard/InventoryDashboard';
import { RadiologistDashboard } from '@/features/dashboard/RadiologistDashboard';
import { RecordsDashboard } from '@/features/dashboard/RecordsDashboard';
import { SuperadminDashboard } from '@/features/dashboard/SuperadminDashboard';
import { SystemSettings } from '@/features/dashboard/SystemSettings';
import { PatientPortal } from '@/features/dashboard/PatientPortal';
import { BranchesPage } from '@/features/branches/BranchesPage';
import { PatientsPage } from '@/features/patients/PatientsPage';
import { PatientDetailPage } from '@/features/patients/PatientDetailPage';
import { NewPatientPage } from '@/features/patients/NewPatientPage';
import { QueueIndexPage } from '@/features/queue/QueueIndexPage';
import { BoardPage } from '@/features/queue/BoardPage';
import { CheckInPage } from '@/features/queue/CheckInPage';
import { TriagePage } from '@/features/triage/TriagePage';
import { EncounterPage } from '@/features/emr/EncounterPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { RevenueSummaryReport } from '@/features/reports/RevenueSummaryReport';
import { PaymentsCollectedReport } from '@/features/reports/PaymentsCollectedReport';
import { OutstandingInvoicesReport } from '@/features/reports/OutstandingInvoicesReport';
import { ShaClaimsReport } from '@/features/reports/ShaClaimsReport';
import { DiagnosesSummaryReport } from '@/features/reports/DiagnosesSummaryReport';
import { PatientEncountersReport } from '@/features/reports/PatientEncountersReport';
import { PrescriptionsIssuedReport } from '@/features/reports/PrescriptionsIssuedReport';
import { LabResultsReport } from '@/features/reports/LabResultsReport';
import { QueueThroughputReport } from '@/features/reports/QueueThroughputReport';
import { WaitTimesReport } from '@/features/reports/WaitTimesReport';
import { PatientVolumeReport } from '@/features/reports/PatientVolumeReport';
import { AppointmentStatisticsReport } from '@/features/reports/AppointmentStatisticsReport';
import { StockLevelsReport } from '@/features/reports/StockLevelsReport';
import { ExpiringItemsReport } from '@/features/reports/ExpiringItemsReport';
import { StockConsumptionReport } from '@/features/reports/StockConsumptionReport';
import { AuditLogPage } from '@/features/audit/AuditLogPage';
import SettingsPage from '@/features/settings/SettingsPage';
import { StaffProfilePage } from '@/features/profile/StaffProfilePage';
import { AdminStaffPage } from '@/features/admin-staff/AdminStaffPage';
import { NotFoundPage } from '@/components/feedback/NotFoundPage';
import { PharmacyDashboard } from '@/features/pharmacy/PharmacyDashboard';
import { MedicationsPage } from '@/features/pharmacy/MedicationsPage';
import { PrescriptionsPage } from '@/features/pharmacy/PrescriptionsPage';
import {
  PortalShell,
  PortalHome,
  PortalAppointments,
  PortalRecords,
  PortalResults,
  PortalBills,
  PortalMessages,
  PortalProfile,
} from '@/features/portal';

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
  );
}
