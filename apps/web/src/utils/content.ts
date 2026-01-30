import { Content, ContentDataType, ContentVersion, Environment } from '@usertour/types';

/**
 * Convert content list type (plural) to ContentDataType enum
 * e.g., 'flows' -> ContentDataType.FLOW, 'launchers' -> ContentDataType.LAUNCHER
 */
export const getQueryType = (contentType: string): ContentDataType => {
  const typeMap: Record<string, ContentDataType> = {
    flows: ContentDataType.FLOW,
    launchers: ContentDataType.LAUNCHER,
    banners: ContentDataType.BANNER,
    checklists: ContentDataType.CHECKLIST,
    surveys: ContentDataType.SURVEY,
    nps: ContentDataType.NPS,
  };
  return typeMap[contentType] ?? ContentDataType.FLOW;
};

export const isPublishedInAllEnvironments = (
  content: Content | null,
  environmentList: Environment[] | null,
  version: ContentVersion | null,
) => {
  // Early return if any required data is missing
  if (!content?.contentOnEnvironments?.length || !environmentList?.length || !version?.id) {
    return false;
  }

  // Check if all environments have the version published
  return environmentList.every((env) =>
    content?.contentOnEnvironments?.some(
      (item) =>
        item.published && item.publishedVersionId === version.id && item.environment.id === env.id,
    ),
  );
};

export const isPublishedAtLeastOneEnvironment = (content: Content | null) => {
  if (content?.contentOnEnvironments && content?.contentOnEnvironments?.length > 0) {
    return true;
  }
  return false;
};

export const isVersionPublished = (content: Content, versionId: string): boolean => {
  return Boolean(
    content?.contentOnEnvironments?.find(
      (env) => env.published && env.publishedVersionId === versionId,
    ),
  );
};
