import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { i18n } from '../i18n';
import type { ApiError, ApiErrorEnvelope } from './types';

const FORBIDDEN_TOAST_DEDUPE_MS = 3000;
let lastForbiddenToastAt = -Infinity;
let bearerToken: string | null = null;

function notifyForbidden(): void {
  const now = performance.now();
  if (now - lastForbiddenToastAt < FORBIDDEN_TOAST_DEDUPE_MS) {
    return;
  }
  lastForbiddenToastAt = now;

  const title = i18n?.t
    ? i18n.t('errors:forbidden')
    : "Your role isn't permitted to do this.";

  window.dispatchEvent(
    new CustomEvent('afya:toast', { detail: { title, variant: 'error' } }),
  );
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    message: string,
    public readonly details: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static fromAxios(err: AxiosError<ApiErrorEnvelope>): HttpError {
    const data = err.response?.data;
    if (data?.error) {
      const env: ApiError = data.error;

      return new HttpError(env.status, env.type, env.message, env.details ?? null);
    }

    return new HttpError(err.response?.status ?? 0, 'NetworkError', err.message);
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

class HttpClientImpl {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      timeout: 30_000,
      headers: { Accept: 'application/json' },
      withCredentials: false,
    });

    this.instance.interceptors.request.use((cfg) => {
      const token = this.getToken();
      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      }

      return cfg;
    });

    this.instance.interceptors.response.use(
      (r) => r,
      (err: AxiosError<ApiErrorEnvelope>) => {
        const httpError = HttpError.fromAxios(err);
        if (httpError.status === 403 && !err.config?.url?.startsWith('/auth/')) {
          notifyForbidden();
        }

        return Promise.reject(httpError);
      },
    );
  }

  setBaseUrl(url: string): void {
    this.instance.defaults.baseURL = url;
  }

  getToken(): string | null {
    return bearerToken;
  }

  setToken(token: string | null): void {
    bearerToken = token;
  }

  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const r = await this.instance.get<T>(url, this.toConfig(options));

    return r.data;
  }

  async post<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const r = await this.instance.post<T>(url, body, this.toConfig(options));

    return r.data;
  }

  async patch<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const r = await this.instance.patch<T>(url, body, this.toConfig(options));

    return r.data;
  }

  async put<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const r = await this.instance.put<T>(url, body, this.toConfig(options));

    return r.data;
  }

  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const r = await this.instance.delete<T>(url, this.toConfig(options));

    return r.data;
  }

  async upload<T>(url: string, file: File, options: RequestOptions = {}): Promise<T> {
    const form = new FormData();
    form.append('file', file);
    const r = await this.instance.post<T>(url, form, {
      ...this.toConfig(options),
      headers: {
        ...options.headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return r.data;
  }

  private toConfig(options: RequestOptions): AxiosRequestConfig {
    return {
      signal: options.signal,
      headers: options.headers,
      params: options.params,
    };
  }
}

export const httpClient = new HttpClientImpl();
export const AxiosHttpClient = HttpClientImpl;
