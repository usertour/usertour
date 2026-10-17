/** Why a token does or does not verify. The keys are the wire strings. */
export const IdentityTokenStatus = {
  valid: 'valid',
  expired: 'expired',
  not_yet_valid: 'not_yet_valid',
  invalid_signature: 'invalid_signature',
  wrong_algorithm: 'wrong_algorithm',
  malformed: 'malformed',
  missing_subject: 'missing_subject',
  no_active_secret: 'no_active_secret',
} as const;

export type IdentityTokenStatus = keyof typeof IdentityTokenStatus;
