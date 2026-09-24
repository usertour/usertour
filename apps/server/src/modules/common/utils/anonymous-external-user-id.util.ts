/**
 * SDK-generated anonymous ids: `anon-` + UUID v4 (see identifyAnonymous in
 * apps/sdk). Only ids in exactly this shape may skip the identity token —
 * anything else unsigned is treated as an unproven identity claim.
 *
 * Deliberately NOT relaxed to bare UUIDs (the pre-2025-11 anonymous format):
 * customers whose real user ids are UUIDs would have those users silently
 * exempted, punching a hole in enforcement. Legacy anonymous ids are instead
 * migrated in the SDK (identifyAnonymous deterministically upgrades a stored
 * bare UUID to `anon-<uuid>`), which the CDN-distributed runtime rolls out
 * automatically.
 */
const ANONYMOUS_USER_ID_PATTERN =
  /^anon-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isAnonymousExternalUserId = (externalUserId: string): boolean => {
  return ANONYMOUS_USER_ID_PATTERN.test(externalUserId);
};
