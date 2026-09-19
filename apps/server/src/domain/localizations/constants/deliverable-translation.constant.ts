import type { Prisma } from '@prisma/client';

/**
 * Which of a version's translations may reach end users: switched on, and for
 * a locale that still exists. Shared by every delivery read so a soft-deleted
 * locale can never be served by one path and hidden by another.
 */
export const DELIVERABLE_TRANSLATION = {
  enabled: true,
  localization: { deleted: false },
} satisfies Prisma.VersionOnLocalizationWhereInput;
