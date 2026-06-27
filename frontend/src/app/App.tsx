import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
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
import { AuditLogPage } from '@/features/audit/AuditLogPage';
import SettingsPage from '@/features/settings/SettingsPage';
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
} from '@/features/portal';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Patient Portal (Separate Shell) */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <PortalShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<PortalHome />} />
        <Route path="appointments" element={<PortalAppointments />} />
        <Route path="records" element={<PortalRecords />} />
        <Route path="results" element={<PortalResults />} />
        <Route path="bills" element={<PortalBills />} />
        <Route path="messages" element={<PortalMessages />} />
      </Route>

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<NewPatientPage />} />
        <Route path="patients/:uuid" element={<PatientDetailPage />} />
        <Route path="queue" element={<QueueIndexPage />} />
        <Route path="queue/check-in" element={<CheckInPage />} />
        <Route path="queue/board/:code" element={<BoardPage />} />
        <Route path="queue/triage/:visitId" element={<TriagePage />} />
        <Route path="emr/encounter/:visitId" element={<EncounterPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="pharmacy" element={<PharmacyDashboard />} />
        <Route path="pharmacy/medications" element={<MedicationsPage />} />
        <Route path="pharmacy/prescriptions" element={<PrescriptionsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}