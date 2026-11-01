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

    protected function registerSpatieGateHook(): void
    {
        Gate::before(function ($user, string $ability): ?bool {
            if ($user === null) {
                return null;
            }

            if ($user->mfa_enabled) {
                $confirmedAt = $user->mfa_confirmed_at;
                $fresh = $user->mfa_enabled
                    && $confirmedAt !== null
                    && $confirmedAt->diffInSeconds(now()) < 600;
                if ($fresh && ! $user->relationLoaded('_mfa_gate_enabled')) {
                    $user->setRelation('_mfa_gate_enabled', $user->mfa()->whereNotNull('enabled_at')->exists());
                }
                if (! $fresh || $user->getRelation('_mfa_gate_enabled') !== true) {
                    return false;
                }
            }

            // Only intercept Spatie dot-notation permissions (e.g. queue.advance)
            // Policy abilities (manage, view, create, delete) have no dot — skip them
            if (! str_contains($ability, '.')) {
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
        $ns = preg_replace('/Policies\\\\(\w+)Policy$/', 'Models\\\\$1', $policyClass, 1, $count);

        return $count === 1 && class_exists($ns) ? $ns : $policyClass;
    }
}
