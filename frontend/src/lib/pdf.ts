/**
 * Dispatches a server-side PDF generation job for a report, polls until ready,
 * then downloads the file as a Blob via native fetch (so the Bearer token can
 * be injected, unlike window.open which cannot carry auth headers).
 *
 * Uses the app's own `afya:toast` event bus — no external toast library needed.
 */

import { httpClient } from '@/lib/http';

function toast(title: string, variant: 'success' | 'error' | 'info'): void {
  window.dispatchEvent(new CustomEvent('afya:toast', { detail: { title, variant } }));
}

function getBearerToken(): string | null {
  return httpClient.getToken();
}

export async function generateAndDownloadPdf(
  reportType: string,
  params: Record<string, string>
): Promise<void> {
  toast('Generating PDF report…', 'info');

  try {
    // 1. Dispatch generation job — httpClient.post<T> returns T directly (already unwrapped)
    const result = await httpClient.post<{ job_id: string }>(
      `/reports/pdf/${reportType}`,
      params
    );
    const jobId = result.job_id;

    // 2. Poll for completion (max 30 attempts, 1 s each)
    let attempts = 0;
    const maxAttempts = 30;

    const poll = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(poll);
        toast('PDF generation timed out. Please try again.', 'error');
        return;
      }

      try {
        // httpClient.get<T> returns T directly
        const status = await httpClient.get<{ status: string }>(
          `/reports/pdf/job/${jobId}/status`
        );

        if (status.status === 'ready') {
          clearInterval(poll);

          // 3. Download via native fetch to carry the Bearer token
          const token = getBearerToken();
          const baseUrl = (httpClient as unknown as { instance: { defaults: { baseURL?: string } } })
            .instance?.defaults?.baseURL ?? '';

          const response = await fetch(
            `${baseUrl}/reports/pdf/job/${jobId}/download`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );

          if (!response.ok) {
            toast('Failed to download PDF.', 'error');
            return;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${reportType}-report.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10_000);

          toast('PDF downloaded successfully.', 'success');
        }
      } catch {
        clearInterval(poll);
        toast('Failed to check PDF status.', 'error');
      }
    }, 1000);

  } catch {
    toast('Failed to start PDF generation.', 'error');
  }
}
