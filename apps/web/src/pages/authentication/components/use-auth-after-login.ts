import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { broadcastAuthSwitch } from '@/utils/auth-channel';

export type AuthMutationResult =
  | {
      requiresTwoFactor?: boolean;
      requiresTwoFactorSetup?: boolean;
      twoFactorChallenge?: string;
    }
  | null
  | undefined;

// Validate ?next= as a same-origin path before treating it as a navigation
// target — rejects absolute URLs (//foo or http://...) so an attacker can't
// craft a log-in link that bounces to an external site.
export const resolveNextPath = (next: string | null | undefined, fallback = '/'): string => {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }
  return next;
};

// Centralises post-login / post-signup branches:
//   1. requiresTwoFactor → /auth/2fa (?next= forwarded)
//   2. requiresTwoFactorSetup → /auth/2fa/setup (?next= forwarded)
//   3. final login success → hard-load `next` (validated) or `/`
//
// Step 3 uses window.location.assign instead of navigate so the new auth
// cookies set by the response take effect — useCurrentUserId reads the
// session cookie at mount time only, so the SPA needs a fresh boot for
// AppContext to see the logged-in user and LandingRedirect to resolve the
// env on a `/` target.
export const useAuthAfterLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback(
    (result: AuthMutationResult): boolean => {
      if (!result) {
        return false;
      }
      const next = searchParams.get('next');
      const forwardNext = next ? `&next=${encodeURIComponent(next)}` : '';

      if (result.requiresTwoFactor && result.twoFactorChallenge) {
        navigate(
          `/auth/2fa?challenge=${encodeURIComponent(result.twoFactorChallenge)}${forwardNext}`,
        );
        return true;
      }
      if (result.requiresTwoFactorSetup && result.twoFactorChallenge) {
        navigate(
          `/auth/2fa/setup?challenge=${encodeURIComponent(result.twoFactorChallenge)}${forwardNext}`,
        );
        return true;
      }
      // Final login success — tell other tabs to reload before we navigate,
      // so any stale React state in those tabs doesn't keep writing to the
      // previous session's user record.
      broadcastAuthSwitch();
      window.location.assign(resolveNextPath(next));
      return true;
    },
    [navigate, searchParams],
  );
};
