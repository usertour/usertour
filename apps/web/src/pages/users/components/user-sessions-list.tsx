import { useUserSessionsContext } from '@/contexts/user-sessions-context';
import { BizSession, ContentDataType, Event } from '@usertour-ui/types';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  LauncherProgressColumn,
  ChecklistProgressColumn,
  FlowProgressColumn,
} from '@/components/molecules/session';
import { useEventListContext } from '@/contexts/event-list-context';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { cn } from '@usertour-ui/ui-utils';
import { FlowIcon, LauncherIcon, ChecklistIcon } from '@usertour-ui/icons';
import { Button } from '@usertour-ui/button';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';

const ProgressColumn = ({ session, eventList }: { session: BizSession; eventList: Event[] }) => {
  const { bizEvent, content, version } = session;

  if (!bizEvent || bizEvent.length === 0 || !content) {
    return <div className="text-muted-foreground">No activity</div>;
  }

  const contentType = content.type;

  if (contentType === ContentDataType.CHECKLIST) {
    if (!version) {
      return <div className="text-muted-foreground">No version data</div>;
    }
    return <ChecklistProgressColumn original={session} eventList={eventList} version={version} />;
  }

  if (contentType === ContentDataType.FLOW) {
    return <FlowProgressColumn original={session} eventList={eventList} />;
  }

  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherProgressColumn original={session} eventList={eventList} />;
  }

  return <div className="text-muted-foreground">Unknown content type</div>;
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

const ContentColumn = ({ session }: { session: BizSession }) => {
  const { content } = session;

  if (!content) {
    return <div className="text-muted-foreground">Unknown content</div>;
  }

  const iconClassName = 'w-4 h-4';

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case ContentDataType.FLOW:
        return <FlowIcon className={iconClassName} />;
      case ContentDataType.LAUNCHER:
        return <LauncherIcon className={iconClassName} />;
      case ContentDataType.CHECKLIST:
        return <ChecklistIcon className={iconClassName} />;
      default:
        return null;
    }
  };

  return (
    <div className="font-medium flex items-center space-x-2 hover:text-primary underline-offset-4 hover:underline transition-colors">
      {getContentIcon(content.type)}
      <div className="flex flex-col">
        <Link to={`/env/${session.environmentId}/${content.type}s/${content.id}/detail`}>
          {content.name}
        </Link>
      </div>
    </div>
  );
};

const LoadMoreButton = () => {
  const { loadMore, totalCount, userSessions, loading } = useUserSessionsContext();
  const hasMore = userSessions.length < totalCount;

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
        {loading ? 'Loading...' : 'Load More Sessions'}
      </Button>
    </div>
  );
};

export const UserSessionsList = () => {
  const { userSessions, loading, totalCount, refetch } = useUserSessionsContext();
  const { eventList } = useEventListContext();

  const handleRefresh = () => {
    refetch();
  };

  if (loading && userSessions.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-4">
            <ListSkeleton length={5} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userSessions.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <img src="/images/rocket.png" alt="No sessions" className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-muted-foreground text-center">No sessions found for this user.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Sessions ({totalCount})</CardTitle>
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
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col w-full grow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Content</TableHead>
                <TableHead className="w-1/3">Progress</TableHead>
                <TableHead className="w-1/3">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userSessions.map((session) => (
                <TableRow
                  key={session.id}
                  className={cn(
                    'cursor-pointer h-12 group transition-colors hover:bg-muted data-[state=selected]:bg-muted',
                  )}
                >
                  <TableCell className="w-1/3">
                    <ContentColumn session={session} />
                  </TableCell>
                  <TableCell className="w-1/3">
                    <Link to={`/env/${session.environmentId}/session/${session.id}`}>
                      <ProgressColumn session={session} eventList={eventList || []} />
                    </Link>
                  </TableCell>
                  <TableCell className="w-1/3">
                    <CreateAtColumn session={session} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <LoadMoreButton />
      </CardContent>
    </Card>
  );
};

UserSessionsList.displayName = 'UserSessionsList';
