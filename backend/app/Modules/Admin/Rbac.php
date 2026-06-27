<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Models\User;
use App\Modules\Admin\Services\RolePermissionService;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Canonical list of roles (foundation §5) and permissions (RBAC matrix).
 *
 * The seeder (`Admin\Database\Seeders\RolesAndPermissionsSeeder`) reads
 * these constants and populates Spatie's tables idempotently.
 */
final class Rbac
{
    /**
     * Role slugs. Exactly ten (foundation §5).
     */
    public const ROLES = [
        'hospital-admin'  => 'Hospital Admin',
        'doctor'          => 'Doctor',
        'nurse'           => 'Nurse',
        'receptionist'    => 'Receptionist',
        'records-officer' => 'Records Officer',
        'pharmacist'      => 'Pharmacist',
        'lab-technician'  => 'Lab Technician',
        'radiologist'     => 'Radiologist',
        'cashier'         => 'Cashier/Accountant',
        'patient'         => 'Patient',
    ];

    /**
     * Roles that MUST enroll in MFA (foundation §11).
     */
    public const MFA_REQUIRED = ['hospital-admin', 'doctor', 'pharmacist'];

    /**
     * Permission catalogue. Mirrors `docs/08-rbac-matrix.md`.
     *
     * Each permission is a dot-separated string; the matrix below maps
     * roles to the permissions they hold.
     */
    public const PERMISSIONS = [
        // Auth & Account
        'users.create', 'users.read', 'users.update', 'users.delete', 'users.list',
        'users.assign-role', 'users.reset-password', 'users.impersonate',
        'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.list',
        'roles.assign-permission', 'mfa.manage-others',

        // Tenancy
        'branches.create', 'branches.read', 'branches.update', 'branches.delete', 'branches.list',
        'branch.view-all', 'branch.switch',

        // Patients
        'patients.create', 'patients.read', 'patients.update', 'patients.delete', 'patients.list',
        'patients.export', 'patients.merge', 'patients.view-own',

        // Appointments
        'appointments.create', 'appointments.read', 'appointments.update', 'appointments.delete',
        'appointments.list', 'appointments.cancel', 'appointments.reschedule', 'appointments.book-own',

        // Queue
        'queue.read', 'queue.list', 'queue.manage', 'queue.call-next', 'queue.override-priority',

        // Visits (chain that ties a patient to tickets/encounters/invoices)
        'visits.create', 'visits.read', 'visits.update', 'visits.list', 'visits.close',

        // Triage
        'triage.create', 'triage.read', 'triage.update', 'triage.list', 'triage.assign-category',

        // EMR
        'emr.create', 'emr.read', 'emr.update', 'emr.delete', 'emr.list', 'emr.sign',
        'emr.amend', 'emr.view-history',
        'vitals.create', 'vitals.read', 'vitals.update', 'vitals.list',
        'diagnoses.create', 'diagnoses.read', 'diagnoses.update', 'diagnoses.delete', 'diagnoses.list',

        // Clinical Alerts
        'alerts.read', 'alerts.list', 'alerts.acknowledge', 'alerts.configure',

        // Pharmacy
        'prescriptions.create', 'prescriptions.read', 'prescriptions.update', 'prescriptions.delete',
        'prescriptions.list', 'prescriptions.dispense', 'prescriptions.substitute', 'prescriptions.verify',
        'pharmacy.read', 'pharmacy.list', 'pharmacy.view-stock', 'pharmacy.manage-stock', 'pharmacy.manage-catalog',

        // Laboratory
        'lab.create', 'lab.read', 'lab.update', 'lab.delete', 'lab.list',
        'lab.order', 'lab.accession', 'lab.enter-result', 'lab.approve-result', 'lab.manage-catalog',

        // Radiology
        'radiology.create', 'radiology.read', 'radiology.update', 'radiology.delete', 'radiology.list',
        'radiology.order', 'radiology.upload-image', 'radiology.report', 'radiology.sign-report',
        'radiology.manage-catalog',

        // Billing
        'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete', 'invoices.list',
        'payments.create', 'payments.read', 'payments.list',
        'billing.refund', 'billing.void-invoice', 'billing.apply-discount', 'billing.reconcile',

        // SHA
        'sha.read', 'sha.list', 'sha.verify-eligibility', 'sha.create-claim',
        'sha.submit-claim', 'sha.appeal-claim', 'sha.pre-auth', 'sha.track-claim', 'sha.reconcile',

        // Inpatient
        'inpatient.admit', 'inpatient.read', 'inpatient.update', 'inpatient.list',
        'inpatient.transfer', 'inpatient.discharge',
        'wards.read', 'wards.list', 'wards.manage',
        'inpatient.view-chart', 'inpatient.create-chart',
        'mar.read', 'mar.administer',

        // Inventory
        'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'inventory.list',
        'inventory.adjust-stock', 'inventory.receive-grn',
        'purchase-orders.create', 'purchase-orders.read', 'purchase-orders.update', 'purchase-orders.list',
        'purchase-orders.approve',

        // Reporting
        'reporting.read', 'reporting.list',
        'reporting.clinical', 'reporting.financial', 'reporting.operational', 'reporting.export',

        // Communication
        'communication.read', 'communication.list', 'communication.send',
        'communication.manage-templates', 'communication.message-provider',

        // Patient Portal
        'portal.access', 'portal.view-results', 'portal.view-invoices', 'portal.pay',

        // Documents
        'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.list',
        'documents.upload', 'documents.download', 'documents.view-own',

        // Audit
        'audit.read', 'audit.list', 'audit.export',

        // Admin
        'settings.read', 'settings.update',
        'catalog.manage', 'sequences.read',

        // Webhooks
        'webhooks.replay',
    ];

    /**
     * Permissions that are intentionally granted to NO role.
     *
     * `emr.delete` exists in the catalogue for completeness but is never
     * granted: clinical records have a ≥10-year retention requirement
     * (foundation §11) and are soft-deleted/amended, never hard-deleted.
     */
    public const NEVER_GRANTED = [
        'emr.delete',
    ];

    /**
     * Permission grants per role. Derived 1:1 from `docs/08-rbac-matrix.md` §6.
     * Format: role_slug => [permissions...].
     *
     * NOTE: deliberately explicit (no wildcards). The documented matrix is NOT
     * a "superuser admin" model — even hospital-admin lacks clinical-action
     * permissions (e.g. emr.create, triage.create) and the `*-own` portal perms.
     * `RbacMatrixTest` asserts every (role, permission) cell matches this array.
     */
    public const ROLE_PERMISSIONS = [
        'hospital-admin' => [
            'users.create', 'users.read', 'users.update', 'users.delete', 'users.list',
            'users.assign-role', 'users.reset-password', 'users.impersonate',
            'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.list',
            'roles.assign-permission', 'mfa.manage-others',
            'branches.create', 'branches.read', 'branches.update', 'branches.delete', 'branches.list',
            'branch.view-all', 'branch.switch',
            'patients.create', 'patients.read', 'patients.update', 'patients.delete', 'patients.list',
            'patients.export', 'patients.merge',
            'appointments.create', 'appointments.read', 'appointments.update', 'appointments.delete',
            'appointments.list', 'appointments.cancel', 'appointments.reschedule',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next', 'queue.override-priority',
            'visits.create', 'visits.read', 'visits.update', 'visits.list', 'visits.close',
            'triage.read', 'triage.list',
            'emr.read', 'emr.list', 'emr.view-history',
            'vitals.read', 'vitals.list',
            'diagnoses.read', 'diagnoses.list',
            'alerts.read', 'alerts.list', 'alerts.configure',
            'prescriptions.read', 'prescriptions.list',
            'pharmacy.read', 'pharmacy.list', 'pharmacy.view-stock', 'pharmacy.manage-stock', 'pharmacy.manage-catalog',
            'lab.read', 'lab.delete', 'lab.list', 'lab.manage-catalog',
            'radiology.read', 'radiology.delete', 'radiology.list', 'radiology.manage-catalog',
            'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete', 'invoices.list',
            'payments.create', 'payments.read', 'payments.list',
            'billing.refund', 'billing.void-invoice', 'billing.apply-discount', 'billing.reconcile',
            'sha.read', 'sha.list', 'sha.verify-eligibility', 'sha.create-claim',
            'sha.submit-claim', 'sha.appeal-claim', 'sha.pre-auth', 'sha.track-claim', 'sha.reconcile',
            'inpatient.read', 'inpatient.list', 'wards.read', 'wards.list', 'wards.manage',
            'inpatient.view-chart', 'mar.read',
            'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'inventory.list',
            'inventory.adjust-stock', 'inventory.receive-grn',
            'purchase-orders.create', 'purchase-orders.read', 'purchase-orders.update',
            'purchase-orders.list', 'purchase-orders.approve',
            'reporting.read', 'reporting.list', 'reporting.clinical', 'reporting.financial',
            'reporting.operational', 'reporting.export',
            'communication.read', 'communication.list', 'communication.send', 'communication.manage-templates',
            'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.list',
            'documents.upload', 'documents.download',
            'audit.read', 'audit.list', 'audit.export',
            'settings.read', 'settings.update', 'catalog.manage', 'sequences.read',
            'webhooks.replay',
        ],
        'doctor' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.read', 'patients.list',
            'appointments.create', 'appointments.read', 'appointments.update', 'appointments.list',
            'appointments.cancel', 'appointments.reschedule',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next', 'queue.override-priority',
            'visits.read', 'visits.list',
            'triage.create', 'triage.read', 'triage.update', 'triage.list', 'triage.assign-category',
            'emr.create', 'emr.read', 'emr.update', 'emr.list', 'emr.sign', 'emr.amend', 'emr.view-history',
            'vitals.create', 'vitals.read', 'vitals.update', 'vitals.list',
            'diagnoses.create', 'diagnoses.read', 'diagnoses.update', 'diagnoses.delete', 'diagnoses.list',
            'alerts.read', 'alerts.list', 'alerts.acknowledge',
            'prescriptions.create', 'prescriptions.read', 'prescriptions.update', 'prescriptions.delete', 'prescriptions.list',
            'pharmacy.read', 'pharmacy.list',
            'lab.create', 'lab.read', 'lab.list', 'lab.order',
            'radiology.create', 'radiology.read', 'radiology.list', 'radiology.order',
            'inpatient.admit', 'inpatient.read', 'inpatient.update', 'inpatient.list',
            'inpatient.transfer', 'inpatient.discharge',
            'wards.read', 'wards.list', 'inpatient.view-chart', 'mar.read',
            'reporting.read', 'reporting.list', 'reporting.clinical', 'reporting.operational',
            'communication.read', 'communication.list', 'communication.send', 'communication.message-provider',
            'documents.create', 'documents.read', 'documents.list', 'documents.upload', 'documents.download',
        ],
        'nurse' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.read', 'patients.list',
            'appointments.create', 'appointments.read', 'appointments.update', 'appointments.list',
            'appointments.reschedule',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next', 'queue.override-priority',
            'visits.create', 'visits.read', 'visits.update', 'visits.list',
            'triage.create', 'triage.read', 'triage.update', 'triage.list', 'triage.assign-category',
            'emr.create', 'emr.read', 'emr.update', 'emr.list', 'emr.view-history',
            'vitals.create', 'vitals.read', 'vitals.update', 'vitals.list',
            'diagnoses.read', 'diagnoses.list',
            'alerts.read', 'alerts.list', 'alerts.acknowledge',
            'prescriptions.read', 'prescriptions.list',
            'lab.read', 'lab.list',
            'radiology.read', 'radiology.list',
            'inpatient.admit', 'inpatient.read', 'inpatient.update', 'inpatient.list',
            'inpatient.transfer', 'wards.read', 'wards.list', 'wards.manage',
            'inpatient.view-chart', 'inpatient.create-chart', 'mar.read', 'mar.administer',
            'inventory.read', 'inventory.list',
            'communication.read', 'communication.list', 'communication.send', 'communication.message-provider',
            'documents.create', 'documents.read', 'documents.list', 'documents.upload', 'documents.download',
        ],
        'receptionist' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.create', 'patients.read', 'patients.update', 'patients.list',
            'appointments.create', 'appointments.read', 'appointments.update', 'appointments.delete', 'appointments.list',
            'appointments.cancel', 'appointments.reschedule',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next',
            'visits.create', 'visits.read', 'visits.update', 'visits.list', 'visits.close',
            'triage.read', 'triage.list',
            'invoices.read', 'invoices.list',
            'payments.read', 'payments.list',
            'sha.read', 'sha.list', 'sha.verify-eligibility', 'sha.pre-auth', 'sha.track-claim',
            'communication.read', 'communication.list', 'communication.send',
            'documents.create', 'documents.read', 'documents.list', 'documents.upload', 'documents.download',
        ],
        'records-officer' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.create', 'patients.read', 'patients.update', 'patients.delete', 'patients.list',
            'patients.export', 'patients.merge',
            'appointments.read', 'appointments.list',
            'emr.read', 'emr.list', 'emr.view-history',
            'diagnoses.read', 'diagnoses.list',
            'reporting.read', 'reporting.list', 'reporting.clinical', 'reporting.operational', 'reporting.export',
            'communication.read', 'communication.list',
            'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.list',
            'documents.upload', 'documents.download',
        ],
        'pharmacist' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.read', 'patients.list',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next',
            'emr.read',
            'alerts.read', 'alerts.list', 'alerts.acknowledge',
            'prescriptions.read', 'prescriptions.list',
            'prescriptions.dispense', 'prescriptions.substitute', 'prescriptions.verify',
            'pharmacy.read', 'pharmacy.list', 'pharmacy.view-stock',
            'pharmacy.manage-stock', 'pharmacy.manage-catalog',
            'inpatient.read', 'inpatient.list', 'inpatient.view-chart', 'mar.read',
            'inventory.create', 'inventory.read', 'inventory.update', 'inventory.list',
            'inventory.adjust-stock', 'inventory.receive-grn',
            'purchase-orders.create', 'purchase-orders.read', 'purchase-orders.update', 'purchase-orders.list',
            'reporting.read', 'reporting.list', 'reporting.operational',
            'communication.read', 'communication.list',
            'documents.read', 'documents.list', 'documents.download',
        ],
        'lab-technician' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.read', 'patients.list',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next',
            'emr.read',
            'lab.create', 'lab.read', 'lab.update', 'lab.list',
            'lab.accession', 'lab.enter-result', 'lab.approve-result', 'lab.manage-catalog',
            'inventory.read', 'inventory.list',
            'reporting.read', 'reporting.list', 'reporting.operational',
            'communication.read', 'communication.list',
            'documents.create', 'documents.read', 'documents.list', 'documents.upload', 'documents.download',
        ],
        'radiologist' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.read', 'patients.list',
            'appointments.read', 'appointments.list',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next',
            'emr.read',
            'radiology.create', 'radiology.read', 'radiology.update', 'radiology.list',
            'radiology.upload-image', 'radiology.report', 'radiology.sign-report',
            'radiology.manage-catalog',
            'inventory.read', 'inventory.list',
            'reporting.read', 'reporting.list', 'reporting.operational',
            'communication.read', 'communication.list',
            'documents.create', 'documents.read', 'documents.list', 'documents.upload', 'documents.download',
        ],
        'cashier' => [
            'branches.read', 'branches.list', 'branch.switch',
            'patients.read', 'patients.list',
            'queue.read', 'queue.list', 'queue.manage', 'queue.call-next',
            'invoices.create', 'invoices.read', 'invoices.update', 'invoices.list',
            'payments.create', 'payments.read', 'payments.list',
            'billing.refund', 'billing.void-invoice', 'billing.apply-discount', 'billing.reconcile',
            'sha.read', 'sha.list', 'sha.verify-eligibility', 'sha.create-claim',
            'sha.submit-claim', 'sha.appeal-claim', 'sha.pre-auth', 'sha.track-claim', 'sha.reconcile',
            'inpatient.read', 'inpatient.list', 'inpatient.view-chart',
            'purchase-orders.read', 'purchase-orders.list',
            'reporting.read', 'reporting.list', 'reporting.financial', 'reporting.operational', 'reporting.export',
            'communication.read', 'communication.list',
            'documents.read', 'documents.list', 'documents.download',
        ],
        'patient' => [
            'patients.view-own',
            'appointments.book-own',
            'communication.message-provider',
            'portal.access', 'portal.view-results', 'portal.view-invoices', 'portal.pay',
            'documents.view-own',
        ],
    ];

    /**
     * @param  \Illuminate\Contracts\Foundation\Application  $app
     */
    public static function seed(\Illuminate\Contracts\Container\Container $app): void
    {
        // Clear cached permissions/roles so newly added ones are visible.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 1) Permissions
        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate([
                'name'       => $name,
                'guard_name' => 'web',
            ]);
        }

        // 2) Roles + their grants
        foreach (self::ROLES as $slug => $label) {
            $role = Role::firstOrCreate([
                'name'       => $slug,
                'guard_name' => 'web',
            ]);

            // Expand wildcards in ROLE_PERMISSIONS
            $granted = self::expandWildcards(self::ROLE_PERMISSIONS[$slug] ?? []);
            $role->syncPermissions($granted);
        }
    }

    /**
     * @param  array<int, string>  $grants
     * @return array<int, string>
     */
    private static function expandWildcards(array $grants): array
    {
        $expanded = [];
        foreach ($grants as $g) {
            if (str_contains($g, '*')) {
                $prefix = str_replace('.*', '', $g);
                foreach (self::PERMISSIONS as $p) {
                    if (str_starts_with($p, $prefix.'.')) {
                        $expanded[] = $p;
                    }
                }
            } else {
                $expanded[] = $g;
            }
        }

        return array_values(array_unique($expanded));
    }
}