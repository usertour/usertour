import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { isPublishedInAllEnvironments } from '@/utils/content';
import { ContentDataType, type AnnouncementData } from '@usertour/types';
import { useMemo } from 'react';

export const useContentPublishState = () => {
  const { content } = useContentDetailContext();
  const { version, isSaving } = useContentVersionContext();
  const { isViewOnly } = useAppContext();
  const { environmentList } = useEnvironmentListContext();

  return useMemo(() => {
    if (isPublishedInAllEnvironments(content, environmentList, version)) {
      return true;
    }

    if (isViewOnly || isSaving) {
      return true;
    }

    if (content?.type === ContentDataType.ANNOUNCEMENT) {
      const announcementData = (version?.data ?? {}) as AnnouncementData;
      return !announcementData.title?.trim();
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
