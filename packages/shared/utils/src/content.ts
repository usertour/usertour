import { ContentVersion, Environment } from '@usertour-ui/types';
import { Content } from '@usertour-ui/types';

export const isPublishedInAllEnvironments = (
  content: Content | null,
  environmentList: Environment[] | null,
  version: ContentVersion | null,
  environment: Environment | null,
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
    content?.environmentId === environment?.id;

  return content?.contentOnEnvironments && content?.contentOnEnvironments.length > 0
    ? isPublishedInAllEnvironments
    : isPublishedInOneEnvironment;
};

export const isPublishedAtLeastOneEnvironment = (content: Content | null) => {
  return content?.contentOnEnvironments
    ? content?.contentOnEnvironments?.length > 0
    : content?.published && content?.publishedVersionId;
};
