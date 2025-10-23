import { ContentVersion, Environment } from '@usertour/types';
import { Content } from '@usertour/types';

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
  return Boolean(content?.contentOnEnvironments?.length);
};

export const isVersionPublished = (content: Content, versionId: string): boolean => {
  return Boolean(
    content?.contentOnEnvironments?.find(
      (env) => env.published && env.publishedVersionId === versionId,
    ),
  );
};
