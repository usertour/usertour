import { Outlet } from 'react-router-dom';

export const AuthLayout = () => (
  <div className="container relative min-h-screen flex flex-col items-center justify-center grid max-w-none grid-cols-1 px-0 min-w-[560px]">
    <div className="relative items-center justify-center h-full flex flex-col bg-muted p-10 text-white dark:border-r flex bg-gradient-to-r from-indigo-700  to-indigo-950">
      <div className="flex flex-col justify-center space-y-6 w-[480px]">
        <Outlet />
      </div>
    </div>
  </div>
);

AuthLayout.displayName = 'AuthLayout';
