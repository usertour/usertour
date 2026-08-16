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
//
// `landingPath` lets a caller interpose a page before the normal landing
// (the post-signup connect-AI step). A VALID ?next= wins over it — today no
// signup entry point actually carries one (the magic-link email and the
// sign-up link are bare), so this is a correctness guard for the login-shaped
// callers, not a live signup flow. The landing rides the 2FA forwarding as
// the next param, so it survives an enrolment step in between.
export const useAuthAfterLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback(
    (result: AuthMutationResult, options?: { landingPath?: string }): boolean => {
      if (!result) {
        return false;
      }
      // ONE normalized target drives every exit. resolveNextPath validates
      // ?next= and falls back to the caller's landing (or '/') — deriving the
      // 2FA forwarding AND the final assign from the same value keeps an
      // invalid or empty ?next= from splitting behavior between branches (an
      // invalid next used to swallow the landing entirely; an empty string
      // kept it on the direct exit but dropped it across the 2FA hop).
      const target = resolveNextPath(searchParams.get('next'), options?.landingPath ?? '/');
      const forwardNext = target !== '/' ? `&next=${encodeURIComponent(target)}` : '';

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
      window.location.assign(target);
      return true;
    },
    [navigate, searchParams],
  );
};
