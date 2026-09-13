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

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    if (stored === 'auto') return 'system';
  } catch (e) {
    // localStorage might be blocked or disabled
  }
  return 'light';
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeMode(mode: ThemeMode): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';

  const systemTheme = getSystemTheme();
  const effective: ResolvedTheme = mode === 'system' ? systemTheme : mode;
  const root = document.documentElement;

  if (effective === 'dark') {
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

  return effective;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultMode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (defaultMode) return defaultMode;
    return getInitialThemeMode();
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initialMode = defaultMode || getInitialThemeMode();
    if (initialMode === 'system') {
      return getSystemTheme();
    }
    return initialMode;
  });

  const syncTheme = useCallback((targetMode: ThemeMode) => {
    const resolved = applyThemeMode(targetMode);
    setResolvedTheme(resolved);
  }, []);

  // Update theme mode and save to storage
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      window.localStorage.setItem('theme', newMode);
    } catch (e) {}
    syncTheme(newMode);
  }, [syncTheme]);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
  }, [mode, setMode]);

  // Synchronize on mount and handle system preference changes
  useEffect(() => {
    const initial = getInitialThemeMode();
    setModeState(initial);
    syncTheme(initial);

    // Listen for storage changes across tabs
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'theme') {
        const val = event.newValue as ThemeMode | null;
        if (val === 'light' || val === 'dark' || val === 'system') {
          setModeState(val);
          syncTheme(val);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, [syncTheme]);

  // Listen for system theme media query changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      syncTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode, syncTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setMode,
    toggleTheme,
  }), [mode, resolvedTheme, setMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside ThemeProvider (e.g. isolated story or test)
    const initial = getInitialThemeMode();
    const system = getSystemTheme();
    const resolved = initial === 'system' ? system : initial;
    return {
      mode: initial,
      resolvedTheme: resolved,
      isDark: resolved === 'dark',
      setMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
