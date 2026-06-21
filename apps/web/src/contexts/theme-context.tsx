import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from '@usertour/helpers';

// The user's appearance choice. `system` defers to the OS color scheme and
// keeps following it live (see the matchMedia listener below).
export type Theme = 'light' | 'dark' | 'system';

// Persisted through the shared AppStorage helper, which namespaces every key
// under `USERTOUR@0.0.1/` — so this lands at `USERTOUR@0.0.1/appearance`, with
// the value JSON-wrapped as { value, time, expire }. The inline boot script in
// index.html reads that exact key synchronously before React mounts (to avoid
// a first-paint flash); keep the two in sync.
const STORAGE_KEY = 'appearance';

const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  // What the user picked (may be 'system').
  theme: Theme;
  // The scheme actually applied right now ('system' resolved against the OS).
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStoredTheme = (): Theme => {
  const stored = storage.getLocalStorage(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  // Default to light when nothing is stored (the user never picked). Not
  // 'system': dark mode ships, but a few surfaces (builder takeover, billing,
  // previews) are intentionally light, so a system-dark user shouldn't be
  // auto-dropped into a partially-dark app. Only an explicit pick opts into
  // system/dark — those are stored, so this default never touches them.
  // Revisit (→ 'system') once dark coverage is complete. Keep in sync with the
  // boot-script fallback in index.html.
  return 'light';
};

const prefersDark = (): boolean => window.matchMedia(DARK_QUERY).matches;

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return prefersDark() ? 'dark' : 'light';
  }
  return theme;
};

const applyTheme = (resolved: 'light' | 'dark'): void => {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props;
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(theme));

  // Apply whenever the choice changes. The boot script already set the class
  // for the initial paint; this keeps it correct on every later switch.
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // While following the system, react to the OS flipping light/dark live.
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const handleChange = () => {
      const resolved = media.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (next: Theme) => {
    // -1 = never expire; AppStorage's default would otherwise drop it after 5m.
    storage.setLocalStorage(STORAGE_KEY, next, -1);
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
