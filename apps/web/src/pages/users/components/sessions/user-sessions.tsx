import { BizSession, ContentDataType, Event, PageInfo } from '@usertour/types';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ListSkeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  BannerProgressCell,
  ChecklistProgressCell,
  FlowProgressCell,
  LauncherProgressCell,
  ResourceCenterProgressCell,
  SessionStatusBadge,
} from '@/components/sessions/session-analytics';
import { useListEventsQuery, useQuerySessionsByExternalIdQuery } from '@usertour/hooks';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@usertour/tailwind';
import {
  BannerIcon,
  ChecklistIcon,
  EventTrackerIcon,
  FlowIcon,
  LauncherIcon,
  ResourceCenterIcon,
  SpinnerIcon,
} from '@usertour/icons';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useAppContext } from '@/contexts/app-context';
import { useLoadMoreAccumulator } from '@/hooks/use-load-more-accumulator';

const PAGE_SIZE = 10;

// Content-type → icon. Map lookup beats an N-way switch when the only
// thing that varies between cases is which component to render.
const ICON_CLASS = 'h-4 w-4 flex-none text-muted-foreground';
const CONTENT_ICON: Partial<Record<ContentDataType, ComponentType<{ className?: string }>>> = {
  [ContentDataType.FLOW]: FlowIcon,
  [ContentDataType.LAUNCHER]: LauncherIcon,
  [ContentDataType.CHECKLIST]: ChecklistIcon,
  [ContentDataType.BANNER]: BannerIcon,
  [ContentDataType.RESOURCE_CENTER]: ResourceCenterIcon,
  [ContentDataType.TRACKER]: EventTrackerIcon,
};

const EmptyCell = () => <span className="text-sm text-muted-foreground">—</span>;

// Progress cell stays a function (not a map) because the per-type
// branches pass different prop shapes — Checklist needs `version`,
// LAUNCHER/BANNER/RESOURCE_CENTER take no event args, etc.
const renderProgressCell = (session: BizSession, eventList: Event[]) => {
  const { bizEvent, content, version } = session;
  if (!bizEvent || bizEvent.length === 0 || !content) return <EmptyCell />;

  switch (content.type) {
    case ContentDataType.CHECKLIST:
      return version ? (
        <ChecklistProgressCell original={session} eventList={eventList} version={version} />
      ) : (
        <EmptyCell />
      );
    case ContentDataType.FLOW:
      return <FlowProgressCell original={session} eventList={eventList} />;
    case ContentDataType.LAUNCHER:
      return <LauncherProgressCell />;
    case ContentDataType.BANNER:
      return <BannerProgressCell />;
    case ContentDataType.RESOURCE_CENTER:
      return <ResourceCenterProgressCell />;
    default:
      return <EmptyCell />;
  }
};

const StatusCell = ({ session }: { session: BizSession }) => {
  const { content, bizEvent } = session;
  if (!content || !bizEvent || bizEvent.length === 0) return <EmptyCell />;
  return <SessionStatusBadge original={session} contentType={content.type as ContentDataType} />;
};

const LastActivityCell = ({ session }: { session: BizSession }) => {
  const { bizEvent, createdAt } = session;
  // No events yet → the session's createdAt is the last activity.
  const ts = bizEvent?.length
    ? Math.max(...bizEvent.map((e) => new Date(e.createdAt).getTime()))
    : new Date(createdAt).getTime();
  return (
    <div className="flex space-x-2">{formatDistanceToNow(new Date(ts), { addSuffix: true })}</div>
  );
};

const ContentCell = ({
  session,
  environmentId,
}: { session: BizSession; environmentId: string }) => {
  const { content } = session;
  const { t } = useTranslation();
  if (!content) return <div className="text-muted-foreground">Unknown content</div>;

  const Icon = CONTENT_ICON[content.type as ContentDataType];

  // Soft-deleted content: session history is preserved server-side, so
  // the row stays visible — but the link to the (now non-existent)
  // content detail page would 404. Render plain text + a "Deleted"
  // badge instead of a link.
  if (content.deleted) {
    return (
      <div className="font-medium flex items-center space-x-2 min-w-0">
        {Icon && <Icon className={ICON_CLASS} />}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <span className="truncate text-muted-foreground line-through">{content.name}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  {t('users.sessions.deletedContentBadge')}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('users.sessions.deletedContentTooltip')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="font-medium flex items-center space-x-2 min-w-0">
      {Icon && <Icon className={ICON_CLASS} />}
      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
        <Link
          to={`/env/${environmentId}/${content.type}s/${content.id}/detail`}
          className="truncate hover:text-primary underline-offset-4 hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {content.name}
        </Link>
      </div>
    </div>
  );
};

const LoadMoreButton = ({
  loading,
  hasMore,
  onLoadMore,
}: { loading: boolean; hasMore: boolean; onLoadMore: () => void }) => {
  const { t } = useTranslation();
  if (!hasMore) return null;
  return (
    <div className="flex justify-center mt-4">
      <Button
        onClick={onLoadMore}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <SpinnerIcon className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          t('users.sessions.loadMore')
        )}
      </Button>
    </div>
  );
};

interface UserSessionsProps {
  environmentId: string;
  externalUserId: string;
}

// Session history for one user. Append-on-cursor-advance accumulation
// via `useLoadMoreAccumulator`; query itself goes through
// `useQuerySessionsByExternalIdQuery` (per ADR 0002).
export const UserSessions = ({ environmentId, externalUserId }: UserSessionsProps) => {
  const { environment, project } = useAppContext();
  const { eventList } = useListEventsQuery(project?.id, { fetchPolicy: 'cache-and-network' });
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [afterCursor, setAfterCursor] = useState<string | undefined>();
  const { sessions, pageInfo, totalCount, loading, refetch } = useQuerySessionsByExternalIdQuery(
    { environmentId, externalUserId },
    { first: PAGE_SIZE, after: afterCursor },
  );

  const {
    items: userSessions,
    totalCount: accumulatedTotal,
    hasMore,
    loading: effectiveLoading,
    loadMore,
    refresh,
  } = useLoadMoreAccumulator<BizSession>({
    pageItems: sessions,
    pageInfo: pageInfo as PageInfo | undefined,
    pageTotalCount: totalCount,
    pageLoading: loading,
    pageRefetch: refetch,
    afterCursor,
    setAfterCursor,
    resetKey: `${environmentId}:${externalUserId}`,
    getId: (session) => session.id,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t('users.sessions.countLabel', { count: accumulatedTotal })}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={refresh}
                disabled={effectiveLoading}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ReloadIcon className={cn('w-4 h-4', effectiveLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reload</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {effectiveLoading && userSessions.length === 0 ? (
        <ListSkeleton length={5} />
      ) : userSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <img src="/images/rocket.png" alt="No sessions" className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-muted-foreground text-center">No sessions found for this user.</p>
        </div>
      ) : (
        <div className="flex flex-col w-full grow">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-5/12">{t('users.sessions.table.content')}</TableHead>
                <TableHead className="w-2/12">{t('users.sessions.table.status')}</TableHead>
                <TableHead className="w-3/12">{t('users.sessions.table.progress')}</TableHead>
                <TableHead className="w-2/12">{t('users.sessions.table.lastActivity')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:h-14">
              {userSessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer group"
                  onClick={() =>
                    environment?.id && navigate(`/env/${environment.id}/session/${session.id}`)
                  }
                >
                  <TableCell className="w-5/12 overflow-hidden">
                    <ContentCell session={session} environmentId={environment?.id ?? ''} />
                  </TableCell>
                  <TableCell className="w-2/12 overflow-hidden">
                    <StatusCell session={session} />
                  </TableCell>
                  <TableCell className="w-3/12 overflow-hidden">
                    {renderProgressCell(session, eventList ?? [])}
                  </TableCell>
                  <TableCell className="w-2/12 overflow-hidden">
                    <LastActivityCell session={session} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LoadMoreButton loading={effectiveLoading} hasMore={hasMore} onLoadMore={loadMore} />
    </div>
  );
};

UserSessions.displayName = 'UserSessions';
