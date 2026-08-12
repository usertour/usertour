import type { AuditLog } from '@usertour/hooks';

/** Truncate an opaque id for display (forensic fallback when no name resolved). */
export const shortId = (id: string | null | undefined): string | null =>
  id ? `${id.slice(0, 10)}…` : null;

/** Friendly actor label: the human's name/email, else the token name, else a short id. */
export const actorLabel = (log: AuditLog): string =>
  log.actorUserName ?? log.actorTokenName ?? shortId(log.actorUserId ?? log.actorTokenId) ?? '—';

/** Friendly resource label: the snapshot name, else a short id. */
export const resourceLabel = (log: AuditLog): string =>
  log.resourceName ?? shortId(log.resourceId) ?? '—';
