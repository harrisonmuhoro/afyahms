<?php

declare(strict_types=1);

namespace App\Providers;

use App\Modules\Auth\Module as AuthModule;
use App\Modules\Tenancy\Module as TenancyModule;
use App\Modules\Patients\Module as PatientsModule;
use App\Modules\Appointments\Module as AppointmentsModule;
use App\Modules\Queue\Module as QueueModule;
use App\Modules\Triage\Module as TriageModule;
use App\Modules\Emr\Module as EmrModule;
use App\Modules\ClinicalAlerts\Module as ClinicalAlertsModule;
use App\Modules\Pharmacy\Module as PharmacyModule;
use App\Modules\Laboratory\Module as LaboratoryModule;
use App\Modules\Radiology\Module as RadiologyModule;
use App\Modules\Billing\Module as BillingModule;
use App\Modules\Insurance\Module as InsuranceModule;
use App\Modules\Inpatient\Module as InpatientModule;
use App\Modules\Inventory\Module as InventoryModule;
use App\Modules\Reporting\Module as ReportingModule;
use App\Modules\Staff\Module as StaffModule;
use App\Modules\Communication\Module as CommunicationModule;
use App\Modules\PatientPortal\Module as PatientPortalModule;
use App\Modules\Documents\Module as DocumentsModule;
use App\Modules\Audit\Module as AuditModule;
use App\Modules\Admin\Module as AdminModule;
use Illuminate\Support\ServiceProvider;

/**
 * Auto-discovers each Modules/{Module}/Providers/*ServiceProvider and registers it.
 * Also exposes a registration hook so modules can boot themselves deterministically.
 */
final class ModuleServiceProvider extends ServiceProvider
{
    /** @var array<int, class-string> */
    public const MODULES = [
        AuthModule::class,
        TenancyModule::class,
        AuditModule::class,
        DocumentsModule::class,
        CommunicationModule::class,
        PatientsModule::class,
        AppointmentsModule::class,
        QueueModule::class,
        TriageModule::class,
        EmrModule::class,
        ClinicalAlertsModule::class,
        PharmacyModule::class,
        LaboratoryModule::class,
        RadiologyModule::class,
        BillingModule::class,
        InsuranceModule::class,
        InpatientModule::class,
        InventoryModule::class,
        ReportingModule::class,
        StaffModule::class,
        PatientPortalModule::class,
        AdminModule::class,
    ];

    public function register(): void
    {
        foreach (self::MODULES as $moduleClass) {
            if (class_exists($moduleClass) && method_exists($moduleClass, 'register')) {
                $moduleClass::register($this->app);
            }
        }
    }

    public function boot(): void
    {
        $modulesPath = app_path('Modules');

        foreach (self::MODULES as $moduleClass) {
            if (class_exists($moduleClass) && method_exists($moduleClass, 'boot')) {
                $moduleClass::boot($this->app);
            }

            // Auto-register each module's *ServiceProvider.php so its routes load.
            $shortName = defined($moduleClass.'::SHORT_NAME') ? $moduleClass::SHORT_NAME : null;
            if ($shortName === null && preg_match('/^App\\\\Modules\\\\([^\\\\]+)\\\\Module$/', $moduleClass, $m) === 1) {
                $shortName = $m[1];
            }
            if ($shortName !== null) {
                $providersDir = $modulesPath.DIRECTORY_SEPARATOR.$shortName.DIRECTORY_SEPARATOR.'Providers';
                if (is_dir($providersDir)) {
                    foreach (glob($providersDir.DIRECTORY_SEPARATOR.'*ServiceProvider.php') ?: [] as $candidate) {
                        $fqcn = 'App\\Modules\\'.$shortName.'\\Providers\\'.basename($candidate, '.php');
                        if (class_exists($fqcn) && ! $this->app->getProvider($fqcn)) {
                            $this->app->register($fqcn);
                        }
                    }
                }
            }
        }
    }
}
