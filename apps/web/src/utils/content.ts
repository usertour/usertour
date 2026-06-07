import { Content, ContentDataType, ContentVersion, Environment, Step } from '@usertour/types';

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
    trackers: ContentDataType.TRACKER,
    'resource-centers': ContentDataType.RESOURCE_CENTER,
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

/**
 * Resolve the editable version id for a content: if `versionId` is live in any
 * environment, fork it via the passed `createVersion` mutation and return the
 * new draft's id; otherwise return `versionId` unchanged. Throws when the fork
 * fails — callers own error presentation (toast vs. propagate). `config` is
 * forwarded to the fork; omit it to keep the source version's config.
 */
export const resolveEditableVersionId = async (
  content: Content,
  versionId: string,
  createVersion: (data: {
    versionId: string;
    config?: unknown;
  }) => Promise<{ id?: string } | null | undefined>,
  config?: unknown,
): Promise<string> => {
  if (!isVersionPublished(content, versionId)) {
    return versionId;
  }
  const created = await createVersion({ versionId, config });
  if (!created?.id) {
    throw new Error('Failed to create a new version');
  }
  return created.id;
};

/**
 * Stable identity for a flow step — the `step/:stepId` route param shared by the
 * flow builder (navigation, sortable list, preview key) and content detail's
 * deep-link into a step, so both agree on what "this step" is. Prefer the server
 * id, fall back to the front-end cvid (present before the first save); the index
 * suffix only guards a step that carries neither and never navigates.
 */
export const getStepId = (step: Step, index: number): string => {
  return step.id ?? step.cvid ?? `step-${index}`;
};
