import { useLayoutEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/theme-context';

const gridPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='none' stroke='white' stroke-width='1'%3E%3Cpath d='M0 0H32V32'/%3E%3C/svg%3E\")";

// Auth pages always render light. Browser autofill paints inputs a near-white
// background that can't be reliably restyled for dark, so a dark auth page would
// show light autofilled fields. We pin these pages to light while mounted and
// restore the user's theme on the way out. The index.html boot script applies
// the same rule for the first paint (keep the `/auth/` prefix in sync).
const useForceLightTheme = () => {
  const { resolvedTheme } = useTheme();
  const resolvedRef = useRef(resolvedTheme);
  resolvedRef.current = resolvedTheme;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const forceLight = () => root.classList.remove('dark');
    forceLight();
    // Re-assert if ThemeProvider re-applies dark (e.g. the OS scheme flips while
    // the user sits on the login page). Removing the class re-fires the
    // observer, but the guard makes that a no-op — no loop.
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark')) {
        forceLight();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      if (resolvedRef.current === 'dark') {
        root.classList.add('dark');
      }
    };
  }, []);
};

export const AuthLayout = () => {
  useForceLightTheme();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: gridPattern, backgroundSize: '32px 32px' }}
      />
      <div className="relative z-10 w-full max-w-[480px] px-4 sm:px-0">
        <div className="rounded-lg shadow-2xl shadow-black/50 ring-1 ring-white/10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

AuthLayout.displayName = 'AuthLayout';
