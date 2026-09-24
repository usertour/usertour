export type SignatureVerdict =
  /** Token present, signature matches an active secret, claims match. */
  | 'valid'
  /** Token present but unverifiable (bad signature, expired, claim mismatch). */
  | 'invalid'
  /** No token supplied. */
  | 'missing'
  /** Unsigned, but the user id is an SDK-generated anonymous id (exempt). */
  | 'anonymous';
