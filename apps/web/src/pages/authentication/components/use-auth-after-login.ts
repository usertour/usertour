import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export type AuthMutationResult =
  | {
      requiresTwoFactor?: boolean;
      requiresTwoFactorSetup?: boolean;
      twoFactorChallenge?: string;
      redirectUrl?: string;
    }
  | null
  | undefined;

// Centralises post-login / post-signup branches:
//   1. requiresTwoFactor → /auth/2fa
//   2. requiresTwoFactorSetup → /auth/2fa/setup
//   3. redirectUrl returned by the backend (e.g. SSO completion URL)
//   4. ?next= query param (deep-link return after guest-mode redirect)
//   5. fall back to "/" → LandingRedirect picks the default env
export const useAuthAfterLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback(
    (result: AuthMutationResult): boolean => {
      if (!result) {
        return false;
      }
      if (result.requiresTwoFactor && result.twoFactorChallenge) {
        navigate(`/auth/2fa?challenge=${encodeURIComponent(result.twoFactorChallenge)}`);
        return true;
      }
      if (result.requiresTwoFactorSetup && result.twoFactorChallenge) {
        navigate(`/auth/2fa/setup?challenge=${encodeURIComponent(result.twoFactorChallenge)}`);
        return true;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return true;
      }
      const next = searchParams.get('next');
      if (next?.startsWith('/') && !next.startsWith('//')) {
        navigate(next, { replace: true });
        return true;
      }
      navigate('/', { replace: true });
      return true;
    },
    [navigate, searchParams],
  );
};
