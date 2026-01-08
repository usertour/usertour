import {
  ActivityLogIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuerySessionDetailQuery } from '@usertour-packages/shared-hooks';
import { BizEvent, BizEvents, ContentDataType, EventAttributes } from '@usertour/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, Fragment } from 'react';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { ChecklistItemsColumn, LauncherProgressColumn } from '@/components/molecules/session';
import { FlowProgressColumn } from '@/components/molecules/session';
import { useEventListContext } from '@/contexts/event-list-context';
import { ChecklistProgressColumn } from '@/components/molecules/session';
import { cn } from '@usertour-packages/tailwind';
import { Button } from '@usertour-packages/button';
import { SessionActionDropdownMenu } from '@/components/molecules/session-action-dropmenu';
import { QuestionAnswer, SessionResponse } from '@/components/molecules/session-detail';
import { ContentLoading } from '@/components/molecules/content-loading';
import {
  getEndReasonTitle,
  getEventDisplaySuffix,
  getFieldValue,
  getOrderedQuestionAnswers,
  getStartReasonTitle,
  sortEventDataEntries,
} from '@/utils/session';

const SessionItemContainer = ({
  children,
  className,
}: { children: React.ReactNode; className?: string }) => {
  return (
    <div
      className={cn('flex flex-col w-full px-6 py-6 grow shadow bg-white rounded-lg', className)}
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

  const endEvent = session?.bizEvent?.find(
    (bizEvent: BizEvent) =>
      bizEvent.event?.codeName === BizEvents.FLOW_ENDED ||
      bizEvent.event?.codeName === BizEvents.CHECKLIST_DISMISSED ||
      bizEvent.event?.codeName === BizEvents.LAUNCHER_DISMISSED,
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

  const questionAnswers = getOrderedQuestionAnswers(session);

  const startReason = getStartReasonTitle(contentType, startEvent);
  const endReason = getEndReasonTitle(contentType, endEvent);
  const routeContentTypes = `${contentType}s`;

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
          <div className="border-b flex flex-col pb-1 min-w-0">
            <span className="text-sm text-foreground/60">User</span>
            <Link
              className="text-primary hover:underline underline-offset-2 truncate"
              to={`/env/${environmentId}/user/${session?.bizUser?.id}`}
            >
              {session?.bizUser?.data?.name ??
                session?.bizUser?.data?.email ??
                session?.bizUser?.data?.externalId ??
                'Unnamed user'}
            </Link>
          </div>
          <div className="border-b flex flex-col pb-1 min-w-0">
            <span className="text-sm text-foreground/60 capitalize">{content.type}</span>
            <Link
              className="text-primary hover:underline underline-offset-2 truncate"
              to={`/env/${environmentId}/${routeContentTypes}/${session?.content?.id}/detail`}
            >
              {session?.content?.name}
            </Link>
          </div>
          <div className="border-b flex flex-col pb-1">
            <span className="text-sm text-foreground/60">Version</span>
            <Link
              className="text-primary hover:underline underline-offset-2"
              to={`/env/${environmentId}/${routeContentTypes}/${session?.content?.id}/versions`}
            >
              V{session?.version?.sequence + 1}
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
            <span>{startReason}</span>
          </div>
          {endEvent && (
            <div className="border-b flex flex-col pb-1">
              <span className="text-sm text-foreground/60">End reason</span>
              <span>{endReason}</span>
            </div>
          )}
        </SessionItemContainer>
        <SessionItemContainer>
          <div className="mb-2 flex flex-row items-center font-bold	">Progress</div>
          {contentType === ContentDataType.CHECKLIST && (
            <div className="flex flex-col gap-8">
              <ChecklistProgressColumn original={session} eventList={eventList} version={version} />
              <ChecklistItemsColumn original={session} eventList={eventList} version={version} />
            </div>
          )}

          {contentType === ContentDataType.FLOW && (
            <FlowProgressColumn original={session} eventList={eventList} />
          )}
          {contentType === ContentDataType.LAUNCHER && (
            <LauncherProgressColumn original={session} eventList={eventList} />
          )}
        </SessionItemContainer>

        {questionAnswers && questionAnswers.length > 0 && (
          <SessionItemContainer>
            <div className="mb-2 flex flex-row items-center font-bold">Response</div>
            <SessionResponse questions={questionAnswers} />
          </SessionItemContainer>
        )}

        <SessionItemContainer>
          <div className="mb-2 flex flex-row items-center font-bold	">
            <ActivityLogIcon width={18} height={18} className="mr-2" />
            Activity feed
          </div>
          <div className="w-full text-sm">
            {bizEvents ? (
              bizEvents.map((bizEvent: BizEvent) => {
                const displaySuffix = getEventDisplaySuffix(bizEvent, session);
                return (
                  <Fragment key={bizEvent.id}>
                    <div
                      className="flex items-center cursor-pointer group border-b hover:bg-muted leading-6"
                      onClick={() => handleRowClick(bizEvent.id)}
                    >
                      <span className="w-1/4 p-2 flex-none">
                        {format(new Date(bizEvent.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                      <div className="flex-1 min-w-0 flex justify-between items-center gap-2 p-2">
                        <span className="truncate">
                          {bizEvent.event?.displayName}
                          {displaySuffix && (
                            <span className="text-muted-foreground ml-2">{displaySuffix}</span>
                          )}
                        </span>
                        {expandedRowId === bizEvent.id ? (
                          <ChevronUpIcon className="h-4 w-4 flex-none opacity-0 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 flex-none opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                    {expandedRowId === bizEvent.id && bizEvent.data && (
                      <div className="bg-muted/50 border-b text-sm">
                        {sortEventDataEntries(bizEvent.data, attributeList || []).map(
                          ([key, value]) => (
                            <div key={key} className="flex border-b last:border-b-0">
                              <span className="w-1/4 p-2 flex-none font-medium truncate">
                                {attributeList?.find((attr) => attr.codeName === key)
                                  ?.displayName || key}
                              </span>
                              <div className="flex-1 min-w-0 p-2">
                                {key === EventAttributes.LIST_ANSWER && (
                                  <div className="overflow-hidden">
                                    <QuestionAnswer answerEvent={bizEvent} />
                                  </div>
                                )}
                                {key !== EventAttributes.LIST_ANSWER && (
                                  <span className="block truncate">
                                    {getFieldValue(key, value)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                No events found.
              </div>
            )}
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
