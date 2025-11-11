import {
  ActivityLogIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuerySessionDetailQuery } from '@usertour-packages/shared-hooks';
import { Table, TableBody, TableCell, TableRow } from '@usertour-packages/table';
import { BizEvent, BizEvents, ContentDataType } from '@usertour/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, Fragment } from 'react';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { LauncherProgressColumn } from '@/components/molecules/session';
import { FlowProgressColumn } from '@/components/molecules/session';
import { useEventListContext } from '@/contexts/event-list-context';
import { ChecklistProgressColumn } from '@/components/molecules/session';
import { cn } from '@usertour/helpers';
import { Button } from '@usertour-packages/button';
import { SessionActionDropdownMenu } from '@/components/molecules/session-action-dropmenu';
import { SessionResponse } from '@/components/molecules/session-detail';
import { ContentLoading } from '@/components/molecules/content-loading';
import {
  deduplicateAnswerEvents,
  getEventDisplaySuffix,
  getFieldValue,
  getStartReasonTitle,
  sortEventDataEntries,
} from '@/utils/session';

const SessionItemContainer = ({
  children,
  className,
}: { children: React.ReactNode; className?: string }) => {
  return (
    <div
      className={cn('flex flex-col w-full px-4 py-6 grow shadow bg-white rounded-lg', className)}
    >
      {children}
    </div>
  );
};

interface SessionDetailContentProps {
  environmentId: string;
  sessionId: string;
}

// Loading wrapper component to handle all loading states
const SessionDetailContentWithLoading = ({
  environmentId,
  sessionId,
}: SessionDetailContentProps) => {
  const { loading: eventListLoading } = useEventListContext();
  const { loading: attributeListLoading } = useAttributeListContext();
  const { session, loading: sessionLoading, refetch } = useQuerySessionDetailQuery(sessionId);

  // Check if any provider is still loading
  const isLoading = eventListLoading || attributeListLoading || sessionLoading;

  if (isLoading) {
    return <ContentLoading />;
  }

  return (
    <SessionDetailContentInner environmentId={environmentId} session={session} refetch={refetch} />
  );
};

// Inner component that handles the actual content rendering
const SessionDetailContentInner = ({
  environmentId,
  session,
  refetch,
}: {
  environmentId: string;
  session: any;
  refetch: () => void;
}) => {
  const navigator = useNavigate();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const { attributeList } = useAttributeListContext();
  const { eventList } = useEventListContext();
  const content = session?.content;
  const contentType = content?.type;
  const version = session?.version;

  const handleRowClick = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const startEvent = session?.bizEvent?.find(
    (bizEvent: BizEvent) =>
      bizEvent.event?.codeName === BizEvents.FLOW_STARTED ||
      bizEvent.event?.codeName === BizEvents.LAUNCHER_SEEN ||
      bizEvent.event?.codeName === BizEvents.CHECKLIST_STARTED,
  );

  if (!eventList || !content || !version) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img
          src="/images/rocket.png"
          alt="Session not found"
          className="w-16 h-16 mb-4 opacity-50"
        />
        <p className="text-muted-foreground text-center">Session not found or incomplete data.</p>
      </div>
    );
  }

  const bizEvents = session?.bizEvent?.sort((a: BizEvent, b: BizEvent) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const answerEvents = deduplicateAnswerEvents(bizEvents);

  return (
    <>
      <div className="border-b bg-white flex-row md:flex w-full fixed justify-between items-center">
        <div className="flex h-16 items-center px-4 w-full">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/users`);
            }}
          />
          <span>Session Detail</span>
          <div className="ml-auto">
            <SessionActionDropdownMenu
              session={session}
              showViewDetails={false}
              showViewResponse={false}
              onDeleteSuccess={() => {
                navigator(`/env/${environmentId}/users`);
              }}
              onEndSuccess={() => {
                refetch();
              }}
            >
              <Button variant="secondary">
                <span className="sr-only">Actions</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </SessionActionDropdownMenu>
          </div>
        </div>
      </div>
      <div className="flex flex-col space-y-6 w-full max-w-screen-xl mx-auto p-14 mt-12  ">
        <SessionItemContainer className="grid grid-cols-2 gap-2 gap-x-12">
          <div className="border-b flex flex-col pb-1">
            <span className="text-sm text-foreground/60">User</span>
            <Link
              className="text-primary hover:underline underline-offset-2"
              to={`/env/${environmentId}/user/${session?.bizUser?.id}`}
            >
              {session?.bizUser?.data?.name ??
                session?.bizUser?.data?.email ??
                session?.bizUser?.data?.externalId ??
                'Unnamed user'}
            </Link>
          </div>
          <div className="border-b flex flex-col pb-1">
            <span className="text-sm text-foreground/60 capitalize">{content.type}</span>
            <Link
              className="text-primary hover:underline underline-offset-2"
              to={`/env/${environmentId}/${content.type}s/${session?.content?.id}/detail`}
            >
              {session?.content?.name}
            </Link>
          </div>
          <div className="border-b flex flex-col pb-1">
            <span className="text-sm text-foreground/60">Version</span>
            <Link
              className="text-primary hover:underline underline-offset-2"
              to={`/env/${environmentId}/flows/${session?.content?.id}/versions`}
            >
              V{session?.version?.sequence}
            </Link>
          </div>
          <div className="border-b flex flex-col pb-1">
            <span className="text-sm text-foreground/60">Started</span>
            <span>
              {session?.createdAt && formatDistanceToNow(new Date(session?.createdAt))} ago
            </span>
          </div>
          <div className="border-b flex flex-col pb-1">
            <span className="text-sm text-foreground/60">Start reason</span>
            <span>{getStartReasonTitle(startEvent)}</span>
          </div>
        </SessionItemContainer>
        <SessionItemContainer>
          <div className="mb-2 flex flex-row items-center font-bold	">Progress</div>
          {contentType === ContentDataType.CHECKLIST && (
            <ChecklistProgressColumn original={session} eventList={eventList} version={version} />
          )}

          {contentType === ContentDataType.FLOW && (
            <FlowProgressColumn original={session} eventList={eventList} />
          )}
          {contentType === ContentDataType.LAUNCHER && (
            <LauncherProgressColumn original={session} eventList={eventList} />
          )}
        </SessionItemContainer>

        {answerEvents && answerEvents.length > 0 && (
          <SessionItemContainer>
            <div className="mb-2 flex flex-row items-center font-bold">Response</div>
            <SessionResponse answerEvents={answerEvents} />
          </SessionItemContainer>
        )}

        <SessionItemContainer>
          <div className="mb-2 flex flex-row items-center font-bold	">
            <ActivityLogIcon width={18} height={18} className="mr-2" />
            Activity feed
          </div>
          <div className="flex flex-col items-center w-full h-full justify-center">
            <Table>
              <TableBody>
                {bizEvents ? (
                  bizEvents.map((bizEvent: BizEvent) => {
                    const displaySuffix = getEventDisplaySuffix(bizEvent, session);
                    return (
                      <Fragment key={bizEvent.id}>
                        <TableRow
                          className="cursor-pointer  h-10 group"
                          onClick={() => handleRowClick(bizEvent.id)}
                        >
                          <TableCell className="w-1/4">
                            {format(new Date(bizEvent.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell className="flex justify-between items-center">
                            <span>
                              {bizEvent.event?.displayName}
                              {displaySuffix && (
                                <span className="text-muted-foreground ml-1">{displaySuffix}</span>
                              )}
                            </span>
                            {expandedRowId === bizEvent.id ? (
                              <ChevronUpIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRowId === bizEvent.id && bizEvent.data && (
                          <TableRow>
                            <TableCell colSpan={2} className="bg-gray-50 p-4">
                              <div className="text-sm">
                                {sortEventDataEntries(bizEvent.data, attributeList || []).map(
                                  ([key, value]) => (
                                    <div key={key} className="py-2 border-b flex flex-row">
                                      <span className="font-medium w-[200px] flex-none">
                                        {attributeList?.find((attr) => attr.codeName === key)
                                          ?.displayName || key}
                                      </span>
                                      <span className="grow">{getFieldValue(key, value)}</span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell className="h-24 text-center">No events found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SessionItemContainer>
      </div>
    </>
  );
};

// Main export component
export function SessionDetailContent(props: SessionDetailContentProps) {
  return <SessionDetailContentWithLoading {...props} />;
}

SessionDetailContent.displayName = 'SessionDetailContent';
