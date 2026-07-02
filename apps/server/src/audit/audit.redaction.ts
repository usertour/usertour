/**
 * Per-resourceType snapshot policy for the `before`/`after` payloads.
 *
 * - `full`     — store the snapshot as-is (config resources, no PII).
 * - `redacted` — store the snapshot but strip PII attribute blobs (biz entities).
 * - `none`     — store no snapshot (recoverable elsewhere: soft delete / version
 *                history). Record the fact + ids only.
 */
export type SnapshotPolicy = 'full' | 'redacted' | 'none';

const POLICY: Record<string, SnapshotPolicy> = {
  segment: 'full',
  theme: 'full',
  attribute: 'full',
  event: 'full',

  user: 'redacted',
  company: 'redacted',
  companyMember: 'redacted',
  session: 'redacted',

  // Recoverable without an audit snapshot: content via version history, both via soft delete.
  content: 'none',
  environment: 'none',

  // Access-lifecycle resources (who can get in, with what): config-shaped, no PII —
  // but their rows/results can carry credentials, stripped by SECRET_KEYS below.
  api_token: 'full',
  // ak_ value is a public client-side key by design (the SDK ships it) — full is safe.
  access_token: 'full',
  oauth_grant: 'full',
  sso_provider: 'full',
  project_sso_settings: 'full',
};

/** Keys holding user-supplied attribute blobs (potential PII) on biz entities. */
const PII_KEYS = ['data', 'attributes'];

/**
 * Keys that hold credentials. Stripped from EVERY stored snapshot regardless of
 * policy — a secret must never land in the audit log. The concrete offenders:
 * createApiToken/rotateApiToken results carry the plaintext `token`; ApiToken
 * rows carry `hashedSecret`; OAuth grants `hashedRefreshToken`; SSO providers
 * `clientSecret`.
 */
const SECRET_KEYS = ['token', 'hashedSecret', 'hashedRefreshToken', 'clientSecret'];

export function snapshotPolicy(resourceType: string): SnapshotPolicy {
  // Unknown types default to `full` so a new resource is captured, not silently dropped.
  return POLICY[resourceType] ?? 'full';
}

/**
 * Apply the resource's snapshot policy to one snapshot value. Returns `undefined`
 * when nothing should be stored (so the JSONB column stays null).
 */
export function redactSnapshot(resourceType: string, value: unknown): unknown {
  const policy = snapshotPolicy(resourceType);
  if (policy === 'none' || value == null) {
    return undefined;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of SECRET_KEYS) {
    if (key in out) {
      out[key] = '[redacted]';
    }
  }
  if (policy === 'redacted') {
    // keep the shape + ids, blank out PII attribute blobs.
    for (const key of PII_KEYS) {
      if (key in out) {
        out[key] = '[redacted]';
      }
    }
  }
  return out;
}
