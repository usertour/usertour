import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useScrollRoot } from '@/contexts/scroll-root-context';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { DotsHorizontalIcon, ResetIcon } from '@radix-ui/react-icons';
import {
  Button,
  Card,
  ComboboxSelect,
  type ComboboxSelectOption,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ListSkeleton,
  QuestionTooltip,
  Separator,
} from '@usertour/ui';
import { SpinnerIcon } from '@usertour/icons';
import { useListContentPublishRecordsQuery } from '@usertour/hooks';
import { cn } from '@usertour/tailwind';
import type { ContentPublishRecord, ContentVersion } from '@usertour/types';
import { format, isToday, isYesterday } from 'date-fns';
import { PlaneIcon } from '@usertour/icons';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { ContentPublishForm } from '../../../shared/content-publish-form';
import { ContentRestoreForm } from '../../../shared/content-restore-form';

type RecordGroup = { key: string; label: string; records: ContentPublishRecord[] };

const groupRecordsByDay = (records: ContentPublishRecord[], t: TFunction): RecordGroup[] => {
  const groups = new Map<string, RecordGroup>();
  for (const record of records) {
    const date = new Date(record.createdAt);
    const key = format(date, 'yyyy-MM-dd');
    let label: string;
    if (isToday(date)) label = t('contents.versions.group.today');
    else if (isYesterday(date)) label = t('contents.versions.group.yesterday');
    else label = format(date, 'PP');

    const existing = groups.get(key);
    if (existing) existing.records.push(record);
    else groups.set(key, { key, label, records: [record] });
  }
  return Array.from(groups.values());
};

/** Who did it: "by S61", "by S61 · via CI key", or "via CI key" when the token has no owner name. */
const actorText = (record: ContentPublishRecord, t: TFunction): string | null => {
  const parts: string[] = [];
  if (record.actorName) {
    parts.push(t('contents.publishHistory.by', { name: record.actorName }));
  }
  if (record.actorTokenName) {
    parts.push(t('contents.publishHistory.viaToken', { token: record.actorTokenName }));
  } else if (!record.actorName && record.actorTokenId) {
    parts.push(t('contents.publishHistory.viaApi'));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

const PublishRecordRow = ({ record }: { record: ContentPublishRecord }) => {
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const [openRestore, setOpenRestore] = useState(false);
  const [openPublish, setOpenPublish] = useState(false);
  const isPublish = record.action === 'publish';
  const actor = actorText(record, t);
  // The restore dialog only reads id + sequence — synthesize the minimal version.
  const restoreTarget = { id: record.versionId, sequence: record.versionSequence };

  return (
    <div className="group grid grid-cols-[72px_1fr_auto] items-center gap-3 px-3 py-2">
      <span className="text-sm text-muted-foreground tabular-nums">
        {format(new Date(record.createdAt), 'p')}
      </span>
      <span className="min-w-0 truncate text-sm">
        <span className="font-medium tabular-nums">v{record.versionSequence + 1}</span>{' '}
        {isPublish ? (
          <span aria-hidden>→</span>
        ) : (
          <span className="text-muted-foreground">{t('contents.publishHistory.unpublished')}</span>
        )}{' '}
        <span className={cn('font-medium', !isPublish && 'text-muted-foreground line-through')}>
          {record.environmentName ?? record.environmentId}
        </span>
        {actor && <span className="text-muted-foreground"> {actor}</span>}
      </span>
      <div className="text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* One-click rollback: publish THIS row's version again (any environment). */}
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isViewOnly}
              onClick={() => setOpenPublish(true)}
            >
              <PlaneIcon className="mr-2 h-4 w-4" />
              {t('contents.versions.action.publish')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isViewOnly}
              onClick={() => setOpenRestore(true)}
            >
              <ResetIcon className="mr-2 h-4 w-4" />
              {t('contents.versions.action.restore')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ContentPublishForm
          versionId={record.versionId}
          open={openPublish}
          onOpenChange={setOpenPublish}
          onSubmit={() => setOpenPublish(false)}
        />
        <ContentRestoreForm
          version={restoreTarget as ContentVersion}
          open={openRestore}
          onOpenChange={setOpenRestore}
          onSubmit={() => setOpenRestore(false)}
        />
      </div>
    </div>
  );
};

export const PublishHistoryList = () => {
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { environmentList } = useEnvironmentList();
  // Server-side environment filter — client filtering would only see loaded pages.
  const [envFilter, setEnvFilter] = useState<string | undefined>(undefined);
  const { recordList, totalCount, hasNextPage, loading, loadingMore, fetchNextPage } =
    useListContentPublishRecordsQuery(contentId, envFilter);

  // Fixed-width dropdown (not pills): pills grow with env count × name length and
  // wrap into a mess; a select stays put no matter how many environments exist.
  const envOptions: ComboboxSelectOption[] = [
    { value: '', label: t('contents.publishHistory.filterAll') },
    ...(environmentList ?? []).map((env) => ({ value: env.id, label: env.name ?? env.id })),
  ];
  // Hidden while there is nothing to filter — but kept once a filter is active,
  // else picking an env with zero records would strand the user.
  const showEnvFilter =
    (environmentList ?? []).length > 1 && (totalCount > 0 || envFilter !== undefined);

  const scrollRoot = useScrollRoot();
  const [sentryRef, { rootRef }] = useInfiniteScroll({
    loading: loading || loadingMore,
    hasNextPage,
    onLoadMore: fetchNextPage,
    rootMargin: '0px 0px 100px 0px',
  });
  useEffect(() => {
    rootRef(scrollRoot);
  }, [rootRef, scrollRoot]);

  const grouped = useMemo(() => groupRecordsByDay(recordList, t), [recordList, t]);

  if (loading && recordList.length === 0) {
    return (
      <Card className="flex flex-col p-4 space-y-4 w-full">
        <h3 className="text-lg font-medium flex items-center gap-1">
          {t('contents.publishHistory.title')}
          <QuestionTooltip>{t('contents.publishHistory.tooltip')}</QuestionTooltip>
        </h3>
        <Separator />
        <ListSkeleton length={3} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col p-4 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-1">
          {t('contents.publishHistory.title')}
          <QuestionTooltip>{t('contents.publishHistory.tooltip')}</QuestionTooltip>
        </h3>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {t('contents.publishHistory.countLabel', { count: totalCount })}
            </span>
          )}
          {showEnvFilter && (
            <ComboboxSelect
              options={envOptions}
              value={envFilter ?? ''}
              onValueChange={(v) => setEnvFilter(v || undefined)}
              size="compact"
              className="w-40 bg-background hover:bg-accent"
            />
          )}
        </div>
      </div>
      <Separator />

      {recordList.length === 0 && !hasNextPage ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          {t(envFilter ? 'contents.publishHistory.emptyFiltered' : 'contents.publishHistory.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <div className="inline-flex w-fit items-center rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground/80">
                {group.label}
              </div>
              <div className="relative ml-4">
                {group.records.length > 1 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-4 bottom-4 w-px bg-border"
                  />
                )}
                {group.records.map((record) => (
                  <div key={record.id} className="relative pl-6">
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-[-4px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ring-2',
                        record.action === 'publish'
                          ? 'bg-success ring-success/30'
                          : 'bg-background dark:bg-muted ring-border/80',
                      )}
                    />
                    <PublishRecordRow record={record} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sentry only earns its footprint when there is (or was) more to load —
          a 3-row list that fits on screen doesn't need an "End of history" marker. */}
      <div
        ref={sentryRef}
        className={cn(
          'flex items-center justify-center',
          hasNextPage || recordList.length > 20 ? 'h-10' : 'h-0',
        )}
      >
        {loadingMore && <SpinnerIcon className="animate-spin text-primary h-5 w-5" />}
        {!hasNextPage && recordList.length > 20 && (
          <span className="text-xs text-muted-foreground">
            {t('contents.publishHistory.endOfHistory')}
          </span>
        )}
      </div>
    </Card>
  );
};

PublishHistoryList.displayName = 'PublishHistoryList';
