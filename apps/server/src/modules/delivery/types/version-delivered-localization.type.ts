import type { Prisma } from '@prisma/client';

/** Enabled per-locale translation slice co-cached with a delivered version. */
export type VersionDeliveredLocalization = {
  localized: Prisma.JsonValue;
  localization: { code: string };
};
