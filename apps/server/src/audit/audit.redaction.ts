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

  // Recoverable without an audit snapshot: version history records every change,
  // soft delete keeps the row. Only content qualifies — an environment RENAME has
  // no history anywhere else, so environments snapshot below.
  content: 'none',
  environment: 'full',

  // Access-lifecycle resources (who can get in, with what): config-shaped, no PII —
  // but their rows/results can carry credentials, stripped by SECRET_KEYS below.
  api_token: 'full',
  // ak_ value is a public client-side key by design (the SDK ships it) — full is safe.
  access_token: 'full',
  // utv_ identity-verification signing secret: lifecycle facts only, the `secret`
  // itself (plaintext in create results, encrypted in rows) is a SECRET_KEY.
  signing_secret: 'full',
  // third-party credentials blanked via REDACT_KEYS_BY_TYPE; the rest is config.
  integration: 'full',
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
 * `clientSecret`; createSigningSecret results carry the plaintext `secret`
 * (rows carry it encrypted).
 */
const SECRET_KEYS = ['token', 'hashedSecret', 'hashedRefreshToken', 'clientSecret', 'secret'];

/**
 * Resource-specific keys to blank in addition to SECRET_KEYS. `integration` rows
 * carry third-party credentials under names too generic for the global list
 * (`key`, `accessToken`) and inside the `config` JSONB (nested, provider-shaped) —
 * blank the whole blob rather than trying to parse it.
 */
const REDACT_KEYS_BY_TYPE: Record<string, string[]> = {
  integration: ['key', 'accessToken', 'config'],
};

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
  for (const key of [...SECRET_KEYS, ...(REDACT_KEYS_BY_TYPE[resourceType] ?? [])]) {
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
