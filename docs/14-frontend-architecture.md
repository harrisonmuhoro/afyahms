# 14 — Frontend Architecture

> **Scope:** Definitive frontend engineering blueprint for **Afya HMS**.
> Consumes the Laravel REST API defined in `09-system-architecture.md`; obeys all canonical decisions in `00-foundation.md`.
> Stack: **React 18 · TypeScript (strict) · Vite · TanStack Query · Zustand · React Hook Form + Zod · React Router v6 · react-i18next · Tailwind (class dark mode) · Recharts · FullCalendar · vite-plugin-pwa**.
> If anything here contradicts `00-foundation.md`, the foundation wins.

**Document version:** 1.0 · **Status:** MVP architecture baseline

---

## Table of contents

1. [Principles & constraints](#1-principles--constraints)
2. [Folder structure](#2-folder-structure)
3. [Anatomy of a feature](#3-anatomy-of-a-feature)
4. [Data layer — TanStack Query + Axios](#4-data-layer--tanstack-query--axios)
5. [Client state — Zustand stores](#5-client-state--zustand-stores)
6. [Forms — React Hook Form + Zod](#6-forms--react-hook-form--zod)
7. [Routing — React Router v6](#7-routing--react-router-v6)
8. [Internationalisation — react-i18next](#8-internationalisation--react-i18next)
9. [Theming — light/dark](#9-theming--lightdark)
10. [Icon system](#10-icon-system)
11. [PWA — offline, caching, background sync](#11-pwa--offline-caching-background-sync)
12. [Component architecture & accessibility](#12-component-architecture--accessibility)
13. [Charts (Recharts) & Calendar (FullCalendar)](#13-charts-recharts--calendar-fullcalendar)
14. [Error boundaries, Suspense, loading & skeletons](#14-error-boundaries-suspense-loading--skeletons)
15. [Performance — memoization & virtualization](#15-performance--memoization--virtualization)
16. [Provider composition (app shell)](#16-provider-composition-app-shell)
17. [Conventions checklist](#17-conventions-checklist)

---

## 1. Principles & constraints

| Principle | Rule |
|---|---|
| **Feature-first** | Code is grouped by domain feature (`patients`, `queue`, `pharmacy`…), not by technical type. Each feature is a self-contained slice. |
| **Server state ≠ client state** | All API-derived data lives in **TanStack Query**. All ephemeral UI/session data lives in **Zustand**. The two never duplicate the same fact. |
| **Strict TS, no `any`** | `unknown` + narrowing. Every API response is typed from a Zod schema (single source of truth shared with validation). |
| **No inline CSS / no inline logic** | Tailwind utility classes only. Event handlers with logic are extracted into hooks or named functions. |
| **No emojis, no hardcoded strings** | All user-facing text goes through `react-i18next` (`en` + `sw`). Icons via the central `<Icon/>` registry. |
| **Multi-branch aware** | Every request carries `X-Branch-Id`; query keys are branch-scoped; switching branch invalidates branch-scoped caches. |
| **Permission-gated UI** | Rendering and routing both honour the RBAC matrix (`08-rbac-matrix.md`). UI gates are convenience, never the security boundary — the API re-checks. |
| **PWA-resilient** | Reads cached for offline; writes queued via Background Sync. The app shell loads with zero network. |
| **Accessible by default** | WCAG 2.1 AA: focus management, ARIA, keyboard nav, contrast in both themes. |

---

## 2. Folder structure

```
src/
├── app/                          # App bootstrapping & global wiring
│   ├── App.tsx                   # Root component (providers + router outlet)
│   ├── router.tsx                # Route tree (lazy routes, layouts, guards)
│   ├── queryClient.ts            # TanStack QueryClient instance + defaults
│   └── routes.const.ts           # Centralised route path constants
│
├── features/                     # ── Domain slices (one folder per bounded context)
│   ├── auth/
│   │   ├── api/                  # Query/mutation hooks + raw fetchers
│   │   │   ├── login.mutation.ts
│   │   │   ├── me.query.ts
│   │   │   └── auth.keys.ts
│   │   ├── components/           # Feature-scoped components
│   │   │   ├── LoginForm.tsx
│   │   │   └── MfaChallenge.tsx
│   │   ├── hooks/                # Feature-scoped non-API hooks
│   │   │   └── useLogout.ts
│   │   ├── routes/               # Route-level page components
│   │   │   └── LoginPage.tsx
│   │   ├── schemas/              # Zod schemas (mirror backend FormRequests)
│   │   │   └── login.schema.ts
│   │   ├── types/                # Types inferred from schemas + API shapes
│   │   │   └── auth.types.ts
│   │   └── store/                # Feature Zustand store (only if needed)
│   │       └── auth.store.ts
│   │
│   ├── patients/
│   │   ├── api/ components/ hooks/ routes/ schemas/ types/ store/
│   ├── appointments/
│   ├── queue/                    # Real-time queue board
│   ├── triage/
│   ├── emr/
│   ├── pharmacy/
│   ├── laboratory/
│   ├── radiology/
│   ├── billing/
│   ├── insurance/
│   ├── inpatient/
│   ├── inventory/
│   ├── reporting/                # Recharts dashboards
│   └── ...                       # one per backend module (00-foundation §1)
│
├── components/
│   ├── ui/                       # Design-system primitives (Button, Input, Modal…)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts              # barrel
│   ├── icons/                    # Central SVG registry + <Icon/>
│   │   ├── Icon.tsx
│   │   ├── registry.ts
│   │   └── paths/                # one file per icon (path data only)
│   ├── layout/                   # AppShell, Sidebar, Topbar, BranchSwitcher
│   └── feedback/                 # ErrorBoundary, EmptyState, OfflineBanner
│
├── lib/                          # Framework-agnostic utilities
│   ├── apiClient.ts              # Axios instance + interceptors
│   ├── queryKeys.ts              # Root query-key factory helpers
│   ├── http.types.ts             # ApiError, Paginated<T>, envelope types
│   ├── permissions.ts            # can() / hasRole() helpers
│   ├── format.ts                 # money (KES), dates (Africa/Nairobi)
│   ├── storage.ts                # typed localStorage wrapper
│   └── env.ts                    # validated import.meta.env access
│
├── hooks/                        # Global cross-feature hooks
│   ├── usePermission.ts
│   ├── useActiveBranch.ts
│   ├── useDebouncedValue.ts
│   ├── useOnlineStatus.ts
│   └── useMediaQuery.ts
│
├── providers/                    # Context providers (composed in app/App.tsx)
│   ├── AppProviders.tsx          # Composition root
│   ├── QueryProvider.tsx
│   ├── ThemeProvider.tsx
│   ├── I18nProvider.tsx
│   ├── ToastProvider.tsx
│   └── PwaProvider.tsx           # update prompt + install prompt
│
├── i18n/
│   ├── index.ts                  # i18next init
│   ├── resources.ts              # namespace → loader map
│   └── locales/
│       ├── en/{common,auth,patients,queue,...}.json
│       └── sw/{common,auth,patients,queue,...}.json
│
├── styles/
│   ├── index.css                 # Tailwind directives + base layer
│   └── tokens.css                # CSS variables (theme tokens)
│
├── test/                         # Vitest setup, RTL helpers, MSW handlers
│   ├── setup.ts
│   └── msw/handlers.ts
│
├── main.tsx                      # ReactDOM root + SW registration
└── vite-env.d.ts
```

**Import discipline**

- A feature **may import** from `components/ui`, `components/icons`, `lib`, `hooks`, `providers`, `i18n`.
- A feature **must not import** from another feature's internals. Cross-feature reuse is promoted to `components/ui` or `lib`. (Enforced via ESLint `no-restricted-imports` / `eslint-plugin-boundaries`.)
- Each feature exposes a thin barrel (`features/patients/index.ts`) for its **routes** and **public hooks** only.

---

## 3. Anatomy of a feature

Every feature follows the same internal contract so any engineer can navigate any slice blind:

| Folder | Responsibility | Never contains |
|---|---|---|
| `schemas/` | Zod schemas. **Source of truth** for types. Mirror backend FormRequest rules. | React |
| `types/` | `z.infer<>` exports + API envelope/request types. | Runtime code |
| `api/` | Query keys + query/mutation hooks + raw axios fetchers. | JSX |
| `hooks/` | Stateful UI logic, derived selectors, orchestration. | Direct axios calls |
| `components/` | Presentational + container components scoped to the feature. | Routing |
| `routes/` | Page-level components mounted by the router (lazy). | Reusable widgets |
| `store/` | Zustand store **only** for client state unique to the feature (e.g. queue board filters). | Server data |

---

## 4. Data layer — TanStack Query + Axios

### 4.1 Axios client with interceptors

The client injects the auth token and active branch, normalises errors, and performs a single-flight **401 → refresh → retry**.

```ts
// src/lib/apiClient.ts
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useBranchStore } from '@/features/auth/store/branch.store';
import type { ApiError } from './http.types';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,          // e.g. https://api.afya.co.ke/api/v1
  withCredentials: true,              // Sanctum SPA cookie for refresh route
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

// ── Request: attach token + X-Branch-Id ───────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  const branchId = useBranchStore.getState().activeBranchId;
  const headers = AxiosHeaders.from(config.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (branchId) headers.set('X-Branch-Id', String(branchId));

  config.headers = headers;
  return config;
});

// ── Response: normalise errors + single-flight 401 refresh ────────────
let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // 401 → try one refresh, then retry the original request
    if (status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing ??= refreshAccessToken();
        const fresh = await refreshing;
        refreshing = null;
        AxiosHeaders.from(original.headers).set('Authorization', `Bearer ${fresh}`);
        return apiClient(original);
      } catch (e) {
        refreshing = null;
        useAuthStore.getState().clear();           // force re-login
        window.location.assign('/login?reason=expired');
        return Promise.reject(normalizeError(e));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

async function refreshAccessToken(): Promise<string> {
  // Refresh route reads the httpOnly Sanctum cookie; returns a new access token.
  const { data } = await axios.post<{ access_token: string }>(
    `${env.API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  useAuthStore.getState().setToken(data.access_token);
  return data.access_token;
}

// ── Error normalisation: one shape for the whole app ──────────────────
export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const res = error.response;
    return {
      status: res?.status ?? 0,
      message:
        (res?.data as { message?: string } | undefined)?.message ??
        (error.code === 'ERR_NETWORK' ? 'offline' : 'unexpected_error'),
      // Laravel 422 validation bag → field errors
      fields: (res?.data as { errors?: Record<string, string[]> } | undefined)?.errors,
      isNetwork: error.code === 'ERR_NETWORK',
      raw: res?.data,
    };
  }
  return { status: 0, message: 'unexpected_error', isNetwork: false };
}
```

```ts
// src/lib/http.types.ts
export interface ApiError {
  status: number;
  message: string;                     // i18n key or backend message
  fields?: Record<string, string[]>;   // 422 validation errors
  isNetwork?: boolean;
  raw?: unknown;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}
```

### 4.2 QueryClient defaults

```ts
// src/app/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/http.types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,             // most HMS reads tolerate 30s staleness
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        const e = err as ApiError;
        if (e.status === 401 || e.status === 403 || e.status === 422) return false;
        return count < 2;            // retry transient/network errors only
      },
    },
    mutations: { retry: 0 },
  },
});
```

### 4.3 Query-key factory (branch-scoped)

Hierarchical, typed keys enable surgical invalidation. **Branch id is part of every operational key** so switching branch cannot leak data.

```ts
// src/features/patients/api/patients.keys.ts
import { useBranchStore } from '@/features/auth/store/branch.store';

export interface PatientListParams {
  q?: string;
  page?: number;
  status?: 'active' | 'inactive';
}

const branch = () => useBranchStore.getState().activeBranchId;

export const patientKeys = {
  all: () => ['patients', branch()] as const,
  lists: () => [...patientKeys.all(), 'list'] as const,
  list: (p: PatientListParams) => [...patientKeys.lists(), p] as const,
  details: () => [...patientKeys.all(), 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};
```

### 4.4 Query hook pattern

```ts
// src/features/patients/api/patients.query.ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Paginated } from '@/lib/http.types';
import type { Patient } from '../types/patient.types';
import { patientKeys, type PatientListParams } from './patients.keys';

const fetchPatients = async (p: PatientListParams) => {
  const { data } = await apiClient.get<Paginated<Patient>>('/patients', { params: p });
  return data;
};

export function usePatients(params: PatientListParams) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => fetchPatients(params),
    placeholderData: keepPreviousData,   // smooth pagination, no flicker
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: async () => (await apiClient.get<{ data: Patient }>(`/patients/${id}`)).data.data,
    enabled: Boolean(id),
  });
}
```

### 4.5 Mutation + cache invalidation

```ts
// src/features/patients/api/createPatient.mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Patient } from '../types/patient.types';
import type { CreatePatientInput } from '../schemas/patient.schema';
import { patientKeys } from './patients.keys';

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) =>
      (await apiClient.post<{ data: Patient }>('/patients', input)).data.data,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });          // refetch lists
      qc.setQueryData(patientKeys.detail(created.id), created);          // seed detail cache
    },
  });
}
```

### 4.6 Optimistic updates (queue board — high-frequency writes)

The queue is mutated constantly (call next, mark seen). Optimistic updates keep the board instant; rollback on failure.

```ts
// src/features/queue/api/advanceTicket.mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queueKeys } from './queue.keys';
import type { QueueTicket } from '../types/queue.types';

export function useAdvanceTicket(station: string) {
  const qc = useQueryClient();
  const key = queueKeys.board(station);

  return useMutation({
    mutationFn: (ticketId: string) =>
      apiClient.post(`/queue/tickets/${ticketId}/advance`),

    onMutate: async (ticketId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<QueueTicket[]>(key);
      qc.setQueryData<QueueTicket[]>(key, (old) =>
        (old ?? []).filter((t) => t.id !== ticketId),     // remove served ticket
      );
      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);  // rollback
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });               // reconcile with server
    },
  });
}
```

> **Realtime:** the queue board also subscribes to Laravel Broadcasting (Reverb/Pusher over WebSockets, see `09`). On a broadcast event the handler calls `queryClient.invalidateQueries(queueKeys.board(station))` so all stations stay in sync without polling.

---

## 5. Client state — Zustand stores

Server state is owned by TanStack Query. Zustand holds **only** client/session/UI state.

| Store | State | Persisted |
|---|---|---|
| `auth.store` | `accessToken`, `user`, `permissions[]`, `roles[]` | token in memory; user hydrated from `/auth/me` |
| `branch.store` | `activeBranchId`, `branches[]` | `localStorage` |
| `theme.store` | `mode: 'light' \| 'dark' \| 'system'` | `localStorage` |
| `ui.store` | `sidebarOpen`, `commandPaletteOpen`, transient modals/toasts | no |

```ts
// src/features/auth/store/auth.store.ts
import { create } from 'zustand';
import type { AuthUser } from '../types/auth.types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  permissions: string[];
  roles: string[];
  setToken: (t: string) => void;
  setSession: (u: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  permissions: [],
  roles: [],
  setToken: (accessToken) => set({ accessToken }),
  setSession: (user) =>
    set({ user, permissions: user.permissions, roles: user.roles }),
  clear: () => set({ accessToken: null, user: null, permissions: [], roles: [] }),
}));
```

```ts
// src/features/auth/store/branch.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@/app/queryClient';
import type { Branch } from '../types/auth.types';

interface BranchState {
  activeBranchId: number | null;
  branches: Branch[];
  setBranches: (b: Branch[]) => void;
  switchBranch: (id: number) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      branches: [],
      setBranches: (branches) => set({ branches }),
      switchBranch: (activeBranchId) => {
        set({ activeBranchId });
        // Branch is part of every operational query key → drop all server caches.
        queryClient.clear();
      },
    }),
    { name: 'afya.branch', partialize: (s) => ({ activeBranchId: s.activeBranchId }) },
  ),
);
```

```ts
// src/features/ui/ui.store.ts
import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setCommandPalette: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCommandPalette: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
```

**Rule of thumb** — *“If a refetch could replace it, it’s server state (Query). If only the user/session can change it, it’s client state (Zustand).”*

---

## 6. Forms — React Hook Form + Zod

### 6.1 Shared schema pattern

Each feature owns a Zod schema in `schemas/`. The schema is the **single source of truth**: RHF validates with it, TS infers the input type from it, and the same shape mirrors the backend FormRequest.

```ts
// src/features/patients/schemas/patient.schema.ts
import { z } from 'zod';

export const patientSchema = z.object({
  firstName: z.string().min(2, 'validation.required'),
  lastName: z.string().min(2, 'validation.required'),
  nationalId: z.string().regex(/^\d{6,9}$/, 'validation.national_id').optional(),
  dateOfBirth: z.coerce.date().max(new Date(), 'validation.dob_future'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^\+?254\d{9}$/, 'validation.phone_ke'),  // Kenya MSISDN
  county: z.string().min(2),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  nextOfKinName: z.string().min(2),
  nextOfKinPhone: z.string().regex(/^\+?254\d{9}$/, 'validation.phone_ke'),
});

export type CreatePatientInput = z.infer<typeof patientSchema>;
```

> Validation messages are **i18n keys**, resolved at render time so error text is bilingual (`en`/`sw`).

### 6.2 Example form (RHF + zodResolver + ui primitives)

```tsx
// src/features/patients/components/PatientForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '@/components/ui';
import { patientSchema, type CreatePatientInput } from '../schemas/patient.schema';
import { useCreatePatient } from '../api/createPatient.mutation';

export function PatientForm({ onCreated }: { onCreated?: (id: string) => void }) {
  const { t } = useTranslation('patients');
  const createPatient = useCreatePatient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(patientSchema),
    defaultValues: { gender: 'male' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createPatient.mutateAsync(values);
      onCreated?.(created.id);
    } catch (err) {
      // Map backend 422 field errors onto the form
      const fields = (err as { fields?: Record<string, string[]> }).fields;
      if (fields) {
        Object.entries(fields).forEach(([name, msgs]) =>
          setError(name as keyof CreatePatientInput, { message: msgs[0] }),
        );
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2" noValidate>
      <Input
        label={t('fields.firstName')}
        {...register('firstName')}
        error={errors.firstName && t(errors.firstName.message ?? '')}
      />
      <Input
        label={t('fields.lastName')}
        {...register('lastName')}
        error={errors.lastName && t(errors.lastName.message ?? '')}
      />
      <Input
        label={t('fields.phone')}
        placeholder="+2547XXXXXXXX"
        {...register('phone')}
        error={errors.phone && t(errors.phone.message ?? '')}
      />
      <Select label={t('fields.gender')} {...register('gender')}>
        <option value="male">{t('gender.male')}</option>
        <option value="female">{t('gender.female')}</option>
        <option value="other">{t('gender.other')}</option>
      </Select>

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {t('actions.register')}
        </Button>
      </div>
    </form>
  );
}
```

The `Input`/`Select` primitives forward refs (`React.forwardRef`) so RHF `register` works, and render `label`, `error`, and `aria-invalid`/`aria-describedby` for accessibility (see §12).

---

## 7. Routing — React Router v6

### 7.1 Route tree with layouts, lazy loading & guards

```tsx
// src/app/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { RouteError } from '@/components/feedback/RouteError';
import { ROUTES } from './routes.const';

// Route-level code splitting — each page is its own chunk.
const LoginPage     = lazy(() => import('@/features/auth/routes/LoginPage'));
const Dashboard     = lazy(() => import('@/features/reporting/routes/DashboardPage'));
const PatientsList  = lazy(() => import('@/features/patients/routes/PatientsListPage'));
const PatientDetail = lazy(() => import('@/features/patients/routes/PatientDetailPage'));
const QueueBoard    = lazy(() => import('@/features/queue/routes/QueueBoardPage'));
const PharmacyDisp  = lazy(() => import('@/features/pharmacy/routes/DispensePage'));

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: ROUTES.login, element: withSuspense(<LoginPage />) }],
  },
  {
    element: <AppLayout />,                 // sidebar + topbar + branch switcher
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <ProtectedRoute>{withSuspense(<Dashboard />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.patients,
        element: (
          <ProtectedRoute permission="patients.view">
            {withSuspense(<PatientsList />)}
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.patientDetail,        // /patients/:id
        element: (
          <ProtectedRoute permission="patients.view">
            {withSuspense(<PatientDetail />)}
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.queue,
        element: (
          <ProtectedRoute permission="queue.view">
            {withSuspense(<QueueBoard />)}
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.pharmacyDispense,
        element: (
          <ProtectedRoute permission="prescriptions.dispense">
            {withSuspense(<PharmacyDisp />)}
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
```

```ts
// src/app/routes.const.ts
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  patients: '/patients',
  patientDetail: '/patients/:id',
  queue: '/queue',
  pharmacyDispense: '/pharmacy/dispense',
} as const;
```

### 7.2 ProtectedRoute (auth + permission check)

```tsx
// src/components/layout/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { usePermission } from '@/hooks/usePermission';
import { ROUTES } from '@/app/routes.const';
import { Forbidden } from '@/components/feedback/Forbidden';

interface Props {
  children: React.ReactNode;
  permission?: string;          // single permission gate
  anyOf?: string[];             // OR-gate
}

export function ProtectedRoute({ children, permission, anyOf }: Props) {
  const location = useLocation();
  const token = useAuthStore((s) => s.accessToken);
  const { can, canAny } = usePermission();

  if (!token) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  if (permission && !can(permission)) return <Forbidden />;
  if (anyOf && !canAny(anyOf)) return <Forbidden />;

  return <>{children}</>;
}
```

```ts
// src/hooks/usePermission.ts
import { useAuthStore } from '@/features/auth/store/auth.store';

export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);
  return {
    can: (perm: string) => permissions.includes(perm),
    canAny: (perms: string[]) => perms.some((p) => permissions.includes(p)),
    hasRole: (slug: string) => roles.includes(slug),
  };
}
```

A `<Can permission="…">` wrapper applies the same gate to inline UI (buttons, menu items) so navigation and controls share one source of truth.

---

## 8. Internationalisation — react-i18next

### 8.1 Config with per-feature namespaces & lazy locale loading

```ts
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

export const NAMESPACES = [
  'common', 'auth', 'patients', 'appointments', 'queue', 'triage',
  'emr', 'pharmacy', 'laboratory', 'radiology', 'billing', 'reporting',
] as const;

void i18n
  .use(LanguageDetector)               // localStorage → navigator
  .use(
    resourcesToBackend(
      (lng: string, ns: string) => import(`./locales/${lng}/${ns}.json`),  // lazy chunks
    ),
  )
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'sw'],
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },   // React already escapes
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
```

```json
// src/i18n/locales/sw/patients.json
{
  "fields": { "firstName": "Jina la kwanza", "lastName": "Jina la ukoo", "phone": "Simu", "gender": "Jinsia" },
  "gender": { "male": "Mwanaume", "female": "Mwanamke", "other": "Nyingine" },
  "actions": { "register": "Sajili mgonjwa" }
}
```

### 8.2 Language switcher

```tsx
// src/components/layout/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <Select
      aria-label="language"
      value={i18n.resolvedLanguage}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </Select>
  );
}
```

> Money and dates are localised via `Intl` (`lib/format.ts`): currency `KES`, timezone `Africa/Nairobi`. No hardcoded user-facing strings anywhere — ESLint `i18next/no-literal-string` enforces this in JSX.

---

## 9. Theming — light/dark

Tailwind `darkMode: 'class'`. The active mode is resolved from the Zustand `theme.store` (`light` | `dark` | `system`) and applied as a class on `<html>`. Persisted in `localStorage`; respects `prefers-color-scheme` when set to `system`.

```ts
// src/features/ui/theme.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({ mode: 'system', setMode: (mode) => set({ mode }) }),
    { name: 'afya.theme' },
  ),
);
```

```tsx
// src/providers/ThemeProvider.tsx
import { useEffect } from 'react';
import { useThemeStore } from '@/features/ui/theme.store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mql.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (mode === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [mode]);

  return <>{children}</>;
}
```

Color tokens are defined as CSS variables in `styles/tokens.css` and surfaced to Tailwind via `theme.extend.colors` (e.g. `bg-surface`, `text-muted`), so a single token set drives both themes and components never hardcode hex values.

```tsx
// Usage — utility classes only, both themes covered:
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100" />
```

---

## 10. Icon system

A single SVG registry + one `<Icon/>` component. **No emojis, no per-file inline SVG markup scattered across the app.**

```ts
// src/components/icons/registry.ts
// Each entry is path data only; the <Icon> wraps it in a sized, a11y-correct <svg>.
export const ICONS = {
  patient: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z',
  queue:   'M4 6h16M4 12h16M4 18h10',
  pharmacy:'M7 7h10v4a5 5 0 0 1-10 0V7Zm0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2',
  lab:     'M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3',
  alert:   'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  // …extended per feature
} as const;

export type IconName = keyof typeof ICONS;
```

```tsx
// src/components/icons/Icon.tsx
import { ICONS, type IconName } from './registry';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  title?: string;          // when set → labelled; else aria-hidden
}

export function Icon({ name, size = 20, title, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"     // inherits text color → theme-aware
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={ICONS[name]} />
    </svg>
  );
}
```

Usage: `<Icon name="patient" />` / `<Icon name="alert" title={t('common.warning')} className="text-red-500" />`.

---

## 11. PWA — offline, caching, background sync

### 11.1 vite-plugin-pwa setup

```ts
// vite.config.ts (excerpt)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',                 // user-confirmed updates (no silent swap mid-shift)
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'fonts/*.woff2'],
      manifest: {
        name: 'Afya HMS',
        short_name: 'Afya',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',       // offline app shell
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
        runtimeCaching: [
          {
            // Cached reads: reference/master data (drug catalog, ICD-10) — long-lived.
            urlPattern: ({ url }) => /\/api\/v1\/(catalog|reference|icd10)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'afya-reference', expiration: { maxAgeSeconds: 86_400 } },
          },
          {
            // Cached reads: recent operational GETs — network-first, fall back to cache offline.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'afya-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 3_600 },
            },
          },
          {
            // Background Sync: failed writes are queued and replayed when back online.
            urlPattern: ({ url, request }) =>
              ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
              url.pathname.startsWith('/api/v1/'),
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'afya-write-queue',
                options: { maxRetentionTime: 24 * 60 },   // retry window: 24h
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 11.2 Strategy summary

| Concern | Strategy |
|---|---|
| **App shell** | Precached; `navigateFallback` → `/index.html` so the SPA loads with zero network. |
| **Reference data** (drug catalog, ICD-10) | `StaleWhileRevalidate`, 24h — rarely changes, instant offline. |
| **Operational reads** (patient summary, queue) | `NetworkFirst` with 4s timeout → cache fallback offline. |
| **Writes** (register, dispense, advance queue) | `NetworkOnly` + **Background Sync** queue; replayed on reconnect. UI marks them *pending sync*. |
| **Updates** | `registerType: 'prompt'` — a non-disruptive “new version available” toast; never auto-reload mid clinical task. |

> **Clinical safety note:** writes that require real-time confirmation (e.g. controlled-drug dispensing, payment capture) are **not** queued silently — the UI surfaces an explicit offline state and blocks irreversible actions until reconnected. Background Sync is reserved for safe, idempotent writes (queue advance, draft notes).

### 11.3 Update & install prompt + offline banner

```tsx
// src/providers/PwaProvider.tsx
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { Toast } from '@/components/ui';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  return (
    <>
      {children}
      {needRefresh && (
        <Toast
          message={t('pwa.updateAvailable')}
          actionLabel={t('pwa.reload')}
          onAction={() => void updateServiceWorker(true)}
        />
      )}
    </>
  );
}
```

```tsx
// src/components/feedback/OfflineBanner.tsx
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Icon } from '@/components/icons/Icon';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation('common');
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-amber-500 px-4 py-1 text-sm text-white">
      <Icon name="alert" /> {t('pwa.offline')}
    </div>
  );
}
```

The native **install prompt** is captured via the `beforeinstallprompt` event (stored in `ui.store`) and surfaced as an in-app “Install Afya” action in the topbar, deferred to a contextual moment rather than fired on load.

---

## 12. Component architecture & accessibility

### 12.1 Layered components

```
ui primitives  →  feature components  →  route pages
(Button, Input)   (PatientForm,          (PatientsListPage)
                   QueueColumn)
```

- **`components/ui`** — unstyled-by-default, token-driven primitives. Stateless, fully typed, ref-forwarding, a11y-complete. They never call the API or import features.
- **Feature components** — compose primitives + feature hooks. Split into *container* (data) and *presentational* (render) where it aids testing.
- **Route pages** — top of a feature; own the page-level data fetching and layout.

### 12.2 Accessible primitive example

```tsx
// src/components/ui/Input.tsx
import { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500
                      dark:bg-gray-800 dark:border-gray-700 ${error ? 'border-red-500' : 'border-gray-300'}
                      ${className ?? ''}`}
          {...rest}
        />
        {error && (
          <span id={errorId} role="alert" className="text-xs text-red-600">{error}</span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
```

**A11y standards applied everywhere:** semantic HTML first, `htmlFor`/`id` pairing, `aria-invalid`/`aria-describedby`, `role="alert"` on errors, visible focus rings in both themes, modal focus-trap + `Esc` to close + restore focus, all interactive controls keyboard-reachable, color never the sole carrier of meaning (triage colours pair with text labels), WCAG AA contrast verified in light and dark.

---

## 13. Charts (Recharts) & Calendar (FullCalendar)

### 13.1 Recharts (reporting dashboards)

Charts are wrapped in a `ResponsiveContainer`, fed from a TanStack Query hook, and pull colours from theme tokens (no hardcoded hex). Tooltips and axis labels are translated.

```tsx
// src/features/reporting/components/RevenueChart.tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useRevenueByDay } from '../api/revenue.query';
import { ChartSkeleton } from '@/components/feedback/ChartSkeleton';
import { formatKes } from '@/lib/format';

export function RevenueChart() {
  const { t } = useTranslation('reporting');
  const { data, isLoading } = useRevenueByDay();
  if (isLoading) return <ChartSkeleton />;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} aria-label={t('charts.revenueByDay')}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v) => formatKes(v)} />
        <Tooltip formatter={(v: number) => formatKes(v)} />
        <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### 13.2 FullCalendar (appointments)

```tsx
// src/features/appointments/components/AppointmentCalendar.tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAppointments } from '../api/appointments.query';
import { useRescheduleAppointment } from '../api/reschedule.mutation';

export function AppointmentCalendar() {
  const { data: events = [] } = useAppointments();
  const reschedule = useRescheduleAppointment();

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      timeZone="Africa/Nairobi"
      nowIndicator
      editable
      events={events}
      eventDrop={(info) =>
        reschedule.mutate({ id: info.event.id, start: info.event.start! })
      }
      height="auto"
    />
  );
}
```

Both libraries are loaded inside lazy route chunks so their weight never hits the initial bundle.

---

## 14. Error boundaries, Suspense, loading & skeletons

- **Route-level error boundary** — React Router `errorElement` (`RouteError`) catches loader/render errors per route; the app shell stays mounted.
- **Component error boundary** — a class `ErrorBoundary` wraps risky widgets (charts, third-party embeds) so one failure doesn’t blank the page.
- **Query errors** — surfaced inline (`isError`) with a retry action; global network loss shows the `OfflineBanner`.
- **Suspense + skeletons** — every lazy route renders a `PageSkeleton`; data widgets render content-shaped skeletons (not spinners) to reduce layout shift.

```tsx
// src/components/feedback/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error('[boundary]', error); /* → Sentry */ }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
```

```tsx
// src/components/ui/Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}
```

---

## 15. Performance — memoization & virtualization

| Technique | Where |
|---|---|
| **Route-level code splitting** | Every page is a lazy chunk; heavy deps (Recharts, FullCalendar) ride along, off the initial bundle. |
| **`keepPreviousData`** | Paginated lists (patients, invoices) — no flicker between pages. |
| **`React.memo` + stable callbacks** | Queue tickets / table rows; handlers wrapped in `useCallback`, derived data in `useMemo`. |
| **List virtualization** | Long queue boards & audit logs use `@tanstack/react-virtual` to render only visible rows. |
| **Selector subscriptions** | Zustand consumers subscribe to slices (`useUiStore(s => s.sidebarOpen)`) to avoid whole-store re-renders. |
| **Query granularity** | Narrow, branch-scoped keys → minimal invalidation blast radius. |
| **Debounced search** | `useDebouncedValue` on typeahead inputs before hitting the API. |

```tsx
// src/features/queue/components/QueueColumn.tsx — virtualized, high-throughput board
import { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { QueueTicketCard } from './QueueTicketCard';
import type { QueueTicket } from '../types/queue.types';

export const QueueColumn = memo(function QueueColumn({ tickets }: { tickets: QueueTicket[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={tickets[row.index].id}
            style={{ position: 'absolute', top: 0, transform: `translateY(${row.start}px)`, width: '100%' }}
          >
            <QueueTicketCard ticket={tickets[row.index]} />
          </div>
        ))}
      </div>
    </div>
  );
});
```

---

## 16. Provider composition (app shell)

```tsx
// src/providers/AppProviders.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';
import { queryClient } from '@/app/queryClient';
import i18n from '@/i18n';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { PwaProvider } from './PwaProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <PwaProvider>{children}</PwaProvider>
          </ToastProvider>
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </I18nextProvider>
  );
}
```

```tsx
// src/app/App.tsx
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/providers/AppProviders';
import { router } from './router';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import '@/i18n';
import '@/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

The app boots by hydrating the session: on mount, if a refresh cookie exists, `useMe()` fetches `/auth/me` → populates `auth.store` (user, permissions, roles) and `branch.store` (branches, active branch) before the protected routes render.

---

## 17. Conventions checklist

> Every PR is reviewed against this list (Husky + ESLint gate where automatable).

- [ ] Feature lives entirely under `src/features/{feature}` with the standard subfolders.
- [ ] No feature imports another feature’s internals (boundaries lint).
- [ ] All server data via TanStack Query; no API data stored in Zustand.
- [ ] Query keys are **branch-scoped** and built from the key factory.
- [ ] Mutations invalidate or optimistically update the right keys; rollback on error.
- [ ] Forms use RHF + `zodResolver`; schema in `schemas/`; types via `z.infer`.
- [ ] Routes lazy-loaded; protected with `<ProtectedRoute permission="…">`.
- [ ] No hardcoded user-facing strings — `t()` with the right namespace, `en` + `sw` keys present.
- [ ] No inline CSS, no inline logic handlers; Tailwind utilities + extracted hooks.
- [ ] No emojis; all glyphs via `<Icon name="…" />`.
- [ ] Light/dark variants provided; colours from tokens, never raw hex.
- [ ] Loading = skeleton, error = inline retry, offline = banner; risky widgets wrapped in a boundary.
- [ ] Long lists virtualized; expensive renders memoized; Zustand selectors are slice-scoped.
- [ ] Accessible: labels, ARIA, keyboard, focus management, AA contrast both themes.
- [ ] PWA: reads cached, safe writes background-synced, update prompt non-disruptive.
- [ ] `strict` TS, no `any`; ESLint + Prettier clean; Vitest + RTL coverage for new logic.

---

*End of document 14 — Frontend Architecture.*
