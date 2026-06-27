<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Finder\Finder;

final class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerPolicies();
        $this->registerModulePolicies();
        $this->registerSpatieGateHook();
    }

    /**
     * Bridge Spatie permissions into Laravel's Gate so `$user->can('x')`
     * and the `permission:` middleware resolve correctly even when no
     * Policy class is registered for the model.
     */
    protected function registerSpatieGateHook(): void
    {
        Gate::before(function ($user, string $ability): ?bool {
            if ($user === null) {
                return null;
            }
            if (method_exists($user, 'hasPermissionTo') && $user->hasPermissionTo($ability)) {
                return true;
            }

            return null;
        });
    }

    protected function registerPolicies(): void
    {
        //
    }

    protected function registerModulePolicies(): void
    {
        $modulesPath = app_path('Modules');
        if (! is_dir($modulesPath)) {
            return;
        }

        foreach (Finder::create()->files()->in($modulesPath)->name('*Policy.php') as $file) {
            $class = $this->classFromPath($file->getRealPath());
            if ($class !== null && class_exists($class)) {
                // ModuleServiceProvider will register policies explicitly;
                // this auto-discovery is a safety net for forgotten bindings.
                Gate::policy(
                    $this->guessModelForPolicy($class),
                    $class,
                );
            }
        }
    }

    private function classFromPath(string $path): ?string
    {
        $contents = file_get_contents($path);
        if ($contents === false) {
            return null;
        }
        if (! preg_match('/namespace\s+([^;]+);.*?class\s+(\w+)/s', $contents, $m)) {
            return null;
        }

        return $m[1].'\\'.$m[2];
    }

    private function guessModelForPolicy(string $policyClass): string
    {
        // Map PatientsPolicy -> App\Modules\Patients\Models\Patient by convention.
        // If unknown, returns the policy class itself as a no-op.
        $ns = preg_replace('/Policies\\\\(\w+)Policy$/', 'Models\\\\$1', $policyClass, 1, $count);

        return $count === 1 && class_exists($ns) ? $ns : $policyClass;
    }
}