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
};

/** Keys holding user-supplied attribute blobs (potential PII) on biz entities. */
const PII_KEYS = ['data', 'attributes'];

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
  if (policy === 'full') {
    return value;
  }
  // redacted: keep the shape + ids, blank out PII attribute blobs.
  if (typeof value === 'object' && !Array.isArray(value)) {
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of PII_KEYS) {
      if (key in out) {
        out[key] = '[redacted]';
      }
    }
    return out;
  }
  return value;
}
