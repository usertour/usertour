import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { isPublishedInAllEnvironments } from '@/utils/content';

/**
 * Shared disable logic for a version's Publish / Restore actions, used by BOTH
 * the version-history rows and the publish-history rows so the two panels
 * can't drift: Publish is pointless when the version is already live in EVERY
 * environment (nowhere left to publish it), Restore is pointless when the
 * version IS the current draft head (it would fork itself). View-only gating
 * stays with each caller — it belongs to the surface, not the version.
 */
export const useVersionActionState = (versionId: string) => {
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { environmentList } = useEnvironmentList();

  return {
    publishDisabled: isPublishedInAllEnvironments(content, environmentList, versionId),
    restoreDisabled: content?.editedVersionId === versionId,
  };
};
