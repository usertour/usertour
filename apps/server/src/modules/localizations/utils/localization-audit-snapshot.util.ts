import type { Prisma } from '@prisma/client';

type LocalizationReader = Pick<Prisma.TransactionClient, 'localization' | 'versionOnLocalization'>;

/**
 * The audit `before` snapshot of a locale: the row plus how many version
 * translations hang off it — the reach of deleting, restoring or re-coding it,
 * without the payloads. One builder for every audited surface (the REST
 * interceptor and the MCP tools), so their entries can never drift apart.
 */
export const localizationAuditSnapshot = async (
  prisma: LocalizationReader,
  id: string,
  projectId?: string,
) => {
  const localization = await prisma.localization.findFirst({
    where: { id, ...(projectId ? { projectId } : {}) },
  });
  if (!localization) {
    return null;
  }
  return {
    ...localization,
    versionTranslations: await prisma.versionOnLocalization.count({
      where: { localizationId: localization.id },
    }),
  };
};
