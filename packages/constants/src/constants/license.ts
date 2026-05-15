/**
 * Feature flag strings issued inside license JWTs (`features` claim).
 * A license token with `'*'` in features grants every flag.
 *
 * `two_factor_auth` covers both per-user enrollment and the instance-level
 * "Require 2FA for all users" toggle. Without it, self-host users cannot
 * enable 2FA on their own accounts and admins cannot turn on enforcement.
 */
export const LICENSE_FEATURE_TWO_FACTOR = 'two_factor_auth';
