import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { isPublishedInAllEnvironments } from '@/utils/content';
import { ContentDataType } from '@usertour/types';
import { useMemo } from 'react';

export const useContentPublishState = () => {
  const { contentId, isSaving } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { isViewOnly } = useAppContext();
  const { environmentList } = useEnvironmentList();

  return useMemo(() => {
    if (isPublishedInAllEnvironments(content, environmentList, version)) {
      return true;
    }

    if (isViewOnly || isSaving) {
      return true;
    }

    // Flow needs at least one step to publish — an empty flow has
    // nothing for the runtime to render.
    if (content?.type === ContentDataType.FLOW) {
      return !version?.steps?.length;
    }

    if (content?.type !== ContentDataType.TRACKER) {
      return false;
    }

    let versionData: Record<string, unknown> = {};
    if (typeof version?.data === 'string') {
      try {
        versionData = JSON.parse(version.data) as Record<string, unknown>;
      } catch {
        versionData = {};
      }
    } else {
      versionData = (version?.data as Record<string, unknown> | null) ?? {};
    }
    const trackerEventId = versionData?.eventId;
    const trackerConditions = (version?.config as { autoStartRules?: unknown[] } | undefined)
      ?.autoStartRules;

    return !trackerEventId || !trackerConditions?.length;
  }, [content, version, environmentList, isViewOnly, isSaving]);
};
