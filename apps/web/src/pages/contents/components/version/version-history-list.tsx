import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionListContext } from '@/contexts/content-version-list-context';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Separator } from '@usertour-packages/separator';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { ContentVersion } from '@usertour/types';
import { format, isToday, isYesterday } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { VersionRow, VersionRowChip } from './version-row';

type VersionGroup = { key: string; label: string; versions: ContentVersion[] };

const groupVersionsByDay = (versions: ContentVersion[]): VersionGroup[] => {
  const groups = new Map<string, VersionGroup>();
  for (const version of versions) {
    const date = new Date(version.createdAt ?? Date.now());
    const key = format(date, 'yyyy-MM-dd');
    let label: string;
    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';
    else label = format(date, 'PP');

    const existing = groups.get(key);
    if (existing) existing.versions.push(version);
    else groups.set(key, { key, label, versions: [version] });
  }
  return Array.from(groups.values());
};

const buildAllChipsMap = (
  content: ReturnType<typeof useContentDetailContext>['content'],
): Map<string, VersionRowChip[]> => {
  const map = new Map<string, VersionRowChip[]>();
  if (content?.editedVersionId) {
    map.set(content.editedVersionId, [{ kind: 'draft' }]);
  }
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

  const chipsMap = useMemo(() => buildAllChipsMap(content), [content]);

  const groupedHistory = useMemo(() => groupVersionsByDay(versionList), [versionList]);

  if (loading) {
    return (
      <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-4 w-full">
        <h3 className="text-lg font-medium flex items-center gap-1">
          Version history
          <QuestionTooltip>
            A timeline of every version, including your current draft and anything currently live.
            Restore or review past versions from here.
          </QuestionTooltip>
        </h3>
        <Separator />
        <ListSkeleton length={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-1">
          Version history
          <QuestionTooltip>
            A timeline of every version, including your current draft and anything currently live.
            Restore or review past versions from here.
          </QuestionTooltip>
        </h3>
        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground">{totalCount} versions</span>
        )}
      </div>
      <Separator />

      {versionList.length === 0 && !hasNextPage ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          No versions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedHistory.map((group) => (
            <div key={group.key} className="flex flex-col">
              <div className="px-3 py-2 text-sm font-semibold">{group.label}</div>
              <div className="flex flex-col divide-y divide-border/60">
                {group.versions.map((version) => (
                  <VersionRow
                    key={version.id}
                    version={version}
                    chips={chipsMap.get(version.id) ?? []}
                    createdDisplay="timeOnly"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex h-10 items-center justify-center">
        {loadingMore && <SpinnerIcon className="animate-spin text-primary h-5 w-5" />}
        {!hasNextPage && versionList.length > 0 && (
          <span className="text-xs text-muted-foreground">End of history</span>
        )}
      </div>
    </div>
  );
};

VersionHistoryList.displayName = 'VersionHistoryList';
