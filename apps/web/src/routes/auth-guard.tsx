import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { FullPageSpinner } from './full-page-spinner';

type GuardMode = 'guest' | 'user' | 'setup';

interface AuthGuardProps {
  mode: GuardMode;
}

// Single state machine for the three auth surface modes.
//   - 'setup':  only reachable when the instance needs a system admin (and no one is logged in)
//   - 'guest':  the public sign-in / sign-up / 2FA / invite surface
//   - 'user':   all logged-in pages (admin shells)
//
// Setup-admin enforcement takes precedence — if the instance still needs
// initialisation, every other route is redirected there.
export const AuthGuard = ({ mode }: AuthGuardProps) => {
  const { userInfo, globalConfig, globalConfigLoading } = useAppContext();
  const location = useLocation();

  if (globalConfigLoading) {
    return <FullPageSpinner />;
  }

  const needsSetup = globalConfig?.needsSystemAdminSetup === true;
  const isLoggedIn = !!userInfo;
  const requires2faEnrollment =
    !!globalConfig?.require2FA && isLoggedIn && !userInfo?.twoFactorEnabled;

  if (needsSetup && mode !== 'setup' && !isLoggedIn) {
    return <Navigate to="/auth/setup-admin" replace />;
  }

  if (!needsSetup && mode === 'setup') {
    return isLoggedIn ? <Navigate to="/" replace /> : <Navigate to="/auth/signin" replace />;
  }

  if (mode === 'setup' && isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (mode === 'user') {
    if (!isLoggedIn) {
      const next = location.pathname + location.search;
      return <Navigate to={`/auth/signin?next=${encodeURIComponent(next)}`} replace />;
    }
    if (requires2faEnrollment && location.pathname !== '/auth/2fa/setup') {
      return <Navigate to="/auth/2fa/setup" replace />;
    }
  }

  if (mode === 'guest' && isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

AuthGuard.displayName = 'AuthGuard';
