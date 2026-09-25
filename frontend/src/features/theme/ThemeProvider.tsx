import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const THEME_KEY = 'afya-theme';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

interface ThemeProviderProps { children: ReactNode }

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const { isAuthenticated, updatePreferences, user } = useAuth();
  const initialPreference = readPreference();
  const [preference, setPreference] = useState<ThemePreference>(() => initialPreference);
  const [theme, setResolvedTheme] = useState<Theme>(() => resolveTheme(initialPreference));
  const userHasChangedTheme = useRef(false);
  const authenticatedUserId = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (): void => {
      if (preference === 'system') setResolvedTheme(resolveTheme('system'));
    };
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, [preference]);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    if (!isAuthenticated) {
      userHasChangedTheme.current = false;
      authenticatedUserId.current = null;
    }
  }, [isAuthenticated]);

  // The database is authoritative once an account is authenticated. This also
  // replaces the previous account's cached preference on shared browsers.
  useEffect(() => {
    if (!isAuthenticated || user === null || userHasChangedTheme.current) return;
    if (authenticatedUserId.current === user.id) return;

    const serverPreference: ThemePreference = user.theme ?? 'system';
    authenticatedUserId.current = user.id;
    localStorage.setItem(THEME_KEY, serverPreference);
    setPreference(serverPreference);
    setResolvedTheme(resolveTheme(serverPreference));
  }, [isAuthenticated, user]);

  const setTheme = useCallback((next: ThemePreference) => {
    // Guest changes are local-only and must not prevent the authenticated
    // account preference from syncing in after login.
    userHasChangedTheme.current = isAuthenticated;
    localStorage.setItem(THEME_KEY, next);
    setPreference(next);
    setResolvedTheme(resolveTheme(next));
    if (isAuthenticated) void updatePreferences({ theme: next }).catch(() => undefined);
  }, [isAuthenticated, updatePreferences]);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme]);
  const value = useMemo(() => ({ theme, preference, setTheme, toggleTheme }), [theme, preference, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
