import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionListContext } from '@/contexts/content-version-list-context';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Separator } from '@usertour-packages/separator';
import { ContentVersion } from '@usertour/types';
import { useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { VersionRow, VersionRowChip } from './version-row';

const buildPinnedIdSet = (content: ReturnType<typeof useContentDetailContext>['content']) => {
  const ids = new Set<string>();
  if (content?.editedVersionId) ids.add(content.editedVersionId);
  for (const coe of content?.contentOnEnvironments ?? []) {
    if (coe.published && coe.publishedVersion) {
      ids.add(coe.publishedVersion.id);
    }
  }
  return ids;
};

const buildLiveChipsMap = (
  content: ReturnType<typeof useContentDetailContext>['content'],
): Map<string, VersionRowChip[]> => {
  const map = new Map<string, VersionRowChip[]>();
  for (const coe of content?.contentOnEnvironments ?? []) {
    if (!coe.published || !coe.publishedVersion) continue;
    const chip: VersionRowChip = {
      kind: 'live',
      environmentName: coe.environment?.name ?? 'Unknown',
      publishedAt: coe.publishedAt,
    };
    const existing = map.get(coe.publishedVersion.id);
    if (existing) existing.push(chip);
    else map.set(coe.publishedVersion.id, [chip]);
  }
  return map;
};

export const VersionHistoryList = () => {
  const { content } = useContentDetailContext();
  const { versionList, totalCount, hasNextPage, loading, loadingMore, fetchNextPage } =
    useContentVersionListContext();

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasNextPage && !loading && !loadingMore) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, loading, loadingMore, fetchNextPage]);

  const pinnedIds = useMemo(() => buildPinnedIdSet(content), [content]);
  const liveChipsMap = useMemo(() => buildLiveChipsMap(content), [content]);

  const historyVersions = useMemo(
    () => versionList.filter((v: ContentVersion) => !pinnedIds.has(v.id)),
    [versionList, pinnedIds],
  );

  if (loading) {
    return (
      <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-4 w-full">
        <h3 className="text-lg font-medium">History</h3>
        <Separator />
        <ListSkeleton length={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">History</h3>
        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground">{totalCount} versions</span>
        )}
      </div>
      <Separator />

      <div className="flex flex-col divide-y divide-border/60">
        {historyVersions.length === 0 && !hasNextPage ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No older versions.
          </div>
        ) : (
          historyVersions.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              chips={liveChipsMap.get(version.id) ?? []}
              showCreatedLabel
            />
          ))
        )}

        <div ref={sentinelRef} className="flex h-10 items-center justify-center">
          {loadingMore && <SpinnerIcon className="animate-spin text-primary h-5 w-5" />}
          {!hasNextPage && historyVersions.length > 0 && (
            <span className="text-xs text-muted-foreground">End of history</span>
          )}
        </div>
      </div>
    </div>
  );
};

VersionHistoryList.displayName = 'VersionHistoryList';
