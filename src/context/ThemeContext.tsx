import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Pure helpers — no side effects
// ---------------------------------------------------------------------------

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    if (stored === 'auto') return 'system';
  } catch {
    // localStorage might be blocked
  }
  return 'light';
}

// ---------------------------------------------------------------------------
// DOM manipulation — following the article's technique of directly setting
// classes on the root element. This is the ONLY place classes are changed
// after the initial blocking script runs.
// ---------------------------------------------------------------------------

function applyThemeToDOM(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

// ---------------------------------------------------------------------------
// Provider — reads initial state but does NOT re-apply to DOM on mount.
// The blocking <script> in __root.tsx already set the correct class before
// the first paint, so we just need to keep React state in sync.
// ---------------------------------------------------------------------------

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredMode()));

  // Toggle / explicit set — the article's toggle pattern:
  // directly manipulate DOM classes + persist to localStorage.
  const setMode = useCallback((newMode: ThemeMode) => {
    const resolved = resolveTheme(newMode);
    setModeState(newMode);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
    try {
      window.localStorage.setItem('theme', newMode);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  }, [mode, setMode]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = resolveTheme('system');
      setResolvedTheme(resolved);
      applyThemeToDOM(resolved);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  // Sync across browser tabs via storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'theme') return;
      const val = e.newValue as ThemeMode | null;
      if (val === 'light' || val === 'dark' || val === 'system') {
        setModeState(val);
        const resolved = resolveTheme(val);
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setMode,
    toggleTheme,
  }), [mode, resolvedTheme, setMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      mode: 'light',
      resolvedTheme: 'light',
      isDark: false,
      setMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

