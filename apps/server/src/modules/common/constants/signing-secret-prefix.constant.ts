/**
 * Prefix for environment signing secrets, part of the `ut?_` credential
 * prefix family (`utp_` personal API token, `uto_` OAuth access token,
 * `utr_` OAuth refresh token, `uts_` reserved for service accounts).
 * `utv_` = identity Verification. The customer uses the full prefixed string
 * as the HS256 signing key.
 */
export const SIGNING_SECRET_PREFIX = 'utv_';
