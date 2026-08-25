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
  // Same rename rationale as environment; the row's `license` is a SECRET_KEY.
  project: 'full',

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
 * rows carry `hashedSecret`; OAuth grants `hashedRefreshToken` (and the rotation
 * grace period's `previousHashedRefreshToken`); SSO providers `clientSecret`;
 * createSigningSecret results carry the plaintext `secret` (rows carry it
 * encrypted); Project rows carry the entitlement `license` key.
 */
const SECRET_KEYS = [
  'token',
  'hashedSecret',
  'hashedRefreshToken',
  'previousHashedRefreshToken',
  'clientSecret',
  'secret',
  'license',
  // The sign-in `Account` rows store third-party tokens PLAINTEXT under these
  // names — no audited snapshot nests that relation today, but stripKeys
  // descends, so an added `include:` stays harmless instead of leaking
  // verbatim.
  'accessToken',
  'refreshToken',
];

/**
 * Resource-specific keys to blank in addition to SECRET_KEYS. `integration`
 * rows carry the provider credential under a name too generic for the global
 * list (`key` — encrypted at rest, but the audit snapshot must not depend on
 * that).
 */
const REDACT_KEYS_BY_TYPE: Record<string, string[]> = {
  integration: ['key'],
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
  const secretKeys = [...SECRET_KEYS, ...(REDACT_KEYS_BY_TYPE[resourceType] ?? [])];
  // 'redacted' policy: keep the shape + ids, blank PII attribute blobs.
  return stripKeys(value, secretKeys, policy === 'redacted' ? PII_KEYS : []);
}

/**
 * Blank the given keys at EVERY depth, descending through arrays and nested
 * objects. The shallow predecessor only scanned top-level keys — one `include:`
 * added to a write handler (nesting a credential-bearing relation, e.g.
 * IntegrationOAuth's plaintext tokens, into the snapshot) would have carried
 * secrets into the log verbatim.
 */
function stripKeys(value: unknown, secretKeys: string[], piiKeys: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripKeys(item, secretKeys, piiKeys));
  }
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out[key] =
      secretKeys.includes(key) || piiKeys.includes(key)
        ? '[redacted]'
        : stripKeys(child, secretKeys, piiKeys);
  }
  return out;
}
