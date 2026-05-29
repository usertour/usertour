import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersionList } from '@/hooks/use-content-version-list';
import { ListSkeleton, Card, Separator, QuestionTooltip } from '@usertour/ui';
import { SpinnerIcon } from '@usertour/icons';
import { Content, ContentVersion } from '@usertour/types';
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

const buildAllChipsMap = (content: Content | null): Map<string, VersionRowChip[]> => {
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
  for (const [versionId, chips] of map) {
    if (chips.some((c) => c.kind === 'live') && chips.some((c) => c.kind === 'draft')) {
      map.set(
        versionId,
        chips.filter((c) => c.kind !== 'draft'),
      );
    }
  }
  return map;
};

export const VersionHistoryList = () => {
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { versionList, totalCount, hasNextPage, loading, loadingMore, fetchNextPage } =
    useContentVersionList(contentId);

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasNextPage && !loading && !loadingMore) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, loading, loadingMore, fetchNextPage]);

  const chipsMap = useMemo(() => buildAllChipsMap(content), [content]);

  const groupedHistory = useMemo(() => groupVersionsByDay(versionList), [versionList]);

  // First-load gating only — once any versions are in cache, a
  // background refetch shouldn't collapse the list to a skeleton.
  if (loading && versionList.length === 0) {
    return (
      <Card className="flex flex-col p-4 space-y-4 w-full">
        <h3 className="text-lg font-medium flex items-center gap-1">
          Version history
          <QuestionTooltip>
            A timeline of every version, including your current draft and anything currently live.
            Restore or review past versions from here.
          </QuestionTooltip>
        </h3>
        <Separator />
        <ListSkeleton length={6} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col p-4 space-y-4 w-full">
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
        <div className="flex flex-col gap-5">
          {groupedHistory.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <div className="inline-flex w-fit items-center rounded-md bg-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground/80">
                {group.label}
              </div>
              <div className="relative ml-4">
                {group.versions.length > 1 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-4 bottom-4 w-px bg-border"
                  />
                )}
                {group.versions.map((version) => {
                  const versionChips = chipsMap.get(version.id) ?? [];
                  const hasLive = versionChips.some((chip) => chip.kind === 'live');
                  const hasDraft = versionChips.some((chip) => chip.kind === 'draft');
                  const dotFillClass = hasLive
                    ? 'bg-success ring-success/30'
                    : hasDraft
                      ? 'bg-primary ring-primary/30'
                      : 'bg-background ring-border/80';
                  return (
                    <div key={version.id} className="relative pl-6">
                      <span
                        aria-hidden
                        className={`absolute left-[-4px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ring-2 ${dotFillClass}`}
                      />
                      <VersionRow
                        version={version}
                        chips={versionChips}
                        createdDisplay="timeOnly"
                      />
                    </div>
                  );
                })}
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
    </Card>
  );
};

VersionHistoryList.displayName = 'VersionHistoryList';
