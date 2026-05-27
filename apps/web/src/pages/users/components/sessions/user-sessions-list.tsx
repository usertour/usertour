import { useUserSessionsContext } from '@/contexts/user-sessions-context';
import { BizSession, ContentDataType, Event } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { ListSkeleton } from '@usertour/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  BannerProgressCell,
  ChecklistProgressCell,
  FlowProgressCell,
  LauncherProgressCell,
  ResourceCenterProgressCell,
  SessionStatusBadge,
} from '@/components/sessions/session-analytics';
import { useListEventsQuery } from '@usertour/hooks';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour/table';
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
import { Button } from '@usertour/button';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/tooltip';
import { useAppContext } from '@/contexts/app-context';

const EmptyCell = () => <span className="text-sm text-muted-foreground">—</span>;

const StatusColumn = ({ session }: { session: BizSession }) => {
  const { content, bizEvent } = session;
  if (!content || !bizEvent || bizEvent.length === 0) {
    return <EmptyCell />;
  }
  return <SessionStatusBadge original={session} contentType={content.type as ContentDataType} />;
};

const ProgressColumn = ({ session, eventList }: { session: BizSession; eventList: Event[] }) => {
  const { bizEvent, content, version } = session;

  if (!bizEvent || bizEvent.length === 0 || !content) {
    return <EmptyCell />;
  }

  const contentType = content.type;

  if (contentType === ContentDataType.CHECKLIST) {
    if (!version) return <EmptyCell />;
    return <ChecklistProgressCell original={session} eventList={eventList} version={version} />;
  }

  if (contentType === ContentDataType.FLOW) {
    return <FlowProgressCell original={session} eventList={eventList} />;
  }

  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherProgressCell />;
  }

  if (contentType === ContentDataType.BANNER) {
    return <BannerProgressCell />;
  }

  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return <ResourceCenterProgressCell />;
  }

  return <EmptyCell />;
};

const CreateAtColumn = ({ session }: { session: BizSession }) => {
  const { bizEvent, createdAt } = session;

  // If no events, show creation time
  if (!bizEvent?.length) {
    return (
      <div className="flex space-x-2">
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </div>
    );
  }

  // Get the most recent event time using Math.max
  const lastEventTime = Math.max(...bizEvent.map((event) => new Date(event.createdAt).getTime()));

  return (
    <div className="flex space-x-2">
      {formatDistanceToNow(new Date(lastEventTime), { addSuffix: true })}
    </div>
  );
};

const ContentColumn = ({
  session,
  environmentId,
}: { session: BizSession; environmentId: string }) => {
  const { content } = session;

  if (!content) {
    return <div className="text-muted-foreground">Unknown content</div>;
  }

  const iconClassName = 'h-4 w-4 flex-none text-muted-foreground';

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case ContentDataType.FLOW:
        return <FlowIcon className={iconClassName} />;
      case ContentDataType.LAUNCHER:
        return <LauncherIcon className={iconClassName} />;
      case ContentDataType.CHECKLIST:
        return <ChecklistIcon className={iconClassName} />;
      case ContentDataType.BANNER:
        return <BannerIcon className={iconClassName} />;
      case ContentDataType.RESOURCE_CENTER:
        return <ResourceCenterIcon className={iconClassName} />;
      case ContentDataType.TRACKER:
        return <EventTrackerIcon className={iconClassName} />;
      default:
        return null;
    }
  };

  return (
    <div className="font-medium flex items-center space-x-2 min-w-0">
      {getContentIcon(content.type)}
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

const LoadMoreButton = () => {
  const { loadMore, totalCount, userSessions, loading } = useUserSessionsContext();
  const hasMore = userSessions.length < totalCount;
  const { t } = useTranslation();

  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex justify-center mt-4">
      <Button
        onClick={loadMore}
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

export const UserSessionsList = () => {
  const { userSessions, loading, totalCount, refetch } = useUserSessionsContext();
  const { environment, project } = useAppContext();
  // Direct cache-and-network query (not the shared context) so SDK-created
  // events show on a fresh visit without a reload.
  const { eventList } = useListEventsQuery(project?.id, { fetchPolicy: 'cache-and-network' });
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t('users.sessions.countLabel', { count: totalCount })}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ReloadIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reload</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {loading && userSessions.length === 0 ? (
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
                  onClick={() => {
                    if (environment?.id) {
                      navigate(`/env/${environment.id}/session/${session.id}`);
                    }
                  }}
                >
                  <TableCell className="w-5/12 overflow-hidden">
                    <ContentColumn session={session} environmentId={environment?.id || ''} />
                  </TableCell>
                  <TableCell className="w-2/12 overflow-hidden">
                    <StatusColumn session={session} />
                  </TableCell>
                  <TableCell className="w-3/12 overflow-hidden">
                    <ProgressColumn session={session} eventList={eventList || []} />
                  </TableCell>
                  <TableCell className="w-2/12 overflow-hidden">
                    <CreateAtColumn session={session} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LoadMoreButton />
    </div>
  );
};

UserSessionsList.displayName = 'UserSessionsList';
