import { SetMetadata } from '@nestjs/common';

/**
 * Marker for resolver methods that an authenticated, not-yet-enrolled user
 * must still be able to reach when the instance enforces 2FA — typically the
 * tiny set of endpoints needed to learn one's enrollment state and to
 * complete enrollment itself (`me`, `startTwoFactorSetup`,
 * `confirmTwoFactorSetup`, `logout`). Every other authenticated mutation is
 * rejected by TwoFactorEnrollmentGuard so a non-browser API client cannot
 * sidestep the policy that the route guard enforces in the SPA.
 */
export const SKIP_2FA_ENROLLMENT_KEY = 'skip2FAEnrollment';
export const SkipTwoFactorEnrollment = () => SetMetadata(SKIP_2FA_ENROLLMENT_KEY, true);
