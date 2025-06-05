import { ContentVersion, Environment } from '@usertour-ui/types';
import { Content } from '@usertour-ui/types';

export const isPublishedInAllEnvironments = (
  content: Content | null,
  environmentList: Environment[] | null,
  version: ContentVersion | null,
) => {
  const isPublishedInAllEnvironments = environmentList?.every((env: Environment) =>
    content?.contentOnEnvironments?.find(
      (item) =>
        item.published && item.publishedVersionId === version?.id && item.environment.id === env.id,
    ),
  );

  const isPublishedInOneEnvironment =
    content?.published &&
    content?.publishedVersionId === version?.id &&
    environmentList &&
    environmentList?.length === 1;

  return content?.contentOnEnvironments && content?.contentOnEnvironments.length > 0
    ? Boolean(isPublishedInAllEnvironments)
    : Boolean(isPublishedInOneEnvironment);
};

export const isPublishedAtLeastOneEnvironment = (content: Content | null) => {
  if (content?.contentOnEnvironments && content?.contentOnEnvironments?.length > 0) {
    return true;
  }
  if (content?.published && content?.publishedVersionId) {
    return true;
  }
  return false;
};
