import { Outlet } from 'react-router-dom';

const gridPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='none' stroke='white' stroke-width='1'%3E%3Cpath d='M0 0H32V32'/%3E%3C/svg%3E\")";

export const AuthLayout = () => (
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

AuthLayout.displayName = 'AuthLayout';
