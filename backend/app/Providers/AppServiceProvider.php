<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureResendCaBundle();

        // Force HTTPS in non-local environments
        if (! app()->isLocal()) {
            URL::forceScheme('https');
        }

        // Money/decimal helpers — wire commonly-used customs globally
        \Illuminate\Database\Eloquent\Model::unguard(false);

        // Eloquent strict mode for development
        if (app()->isLocal()) {
            \Illuminate\Database\Eloquent\Model::preventLazyLoading();
        }
    }

    /**
     * Use an explicitly configured CA bundle for Resend when PHP's system
     * certificate store is not available to the web server process.
     */
    private function configureResendCaBundle(): void
    {
        $caBundle = config('services.resend.ca_bundle');

        if (! is_string($caBundle) || $caBundle === '' || ! is_file($caBundle)) {
            return;
        }

        $apiKey = config('resend.api_key') ?? config('services.resend.key');

        if (! is_string($apiKey) || $apiKey === '') {
            return;
        }

        $apiKeyValue = \Resend\ValueObjects\ApiKey::from($apiKey);
        $baseUri = \Resend\ValueObjects\Transporter\BaseUri::from(getenv('RESEND_BASE_URL') ?: 'api.resend.com');
        $headers = \Resend\ValueObjects\Transporter\Headers::withAuthorization($apiKeyValue);
        $httpClient = new \GuzzleHttp\Client(['verify' => $caBundle]);
        $transporter = new \Resend\Transporters\HttpTransporter($httpClient, $baseUri, $headers);

        $this->app->instance(\Resend\Contracts\Client::class, new \Resend\Client($transporter));
    }
}
