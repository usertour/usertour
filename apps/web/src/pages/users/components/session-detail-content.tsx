import {
  ActivityLogIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuerySessionDetailQuery } from '@usertour-ui/shared-hooks';
import { Table, TableBody, TableCell, TableRow } from '@usertour-ui/table';
import { BizEvent, BizEvents, ContentDataType } from '@usertour-ui/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, Fragment } from 'react';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { LauncherProgressColumn } from '@/components/molecules/session';
import { FlowProgressColumn } from '@/components/molecules/session';
import { useEventListContext } from '@/contexts/event-list-context';
import { ChecklistProgressColumn } from '@/components/molecules/session';
import { cn } from '@usertour-ui/ui-utils';
import { Button } from '@usertour-ui/button';
import { SessionActionDropdownMenu } from '@/components/molecules/session-action-dropmenu';
import { contentTypesConfig } from '@usertour-ui/shared-editor';
import { SessionResponse } from '@/components/molecules/session-detail';

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

export function SessionDetailContent(props: SessionDetailContentProps) {
  const { environmentId, sessionId } = props;
  const navigator = useNavigate();
  const { session, refetch } = useQuerySessionDetailQuery(sessionId);
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
    (bizEvent) => bizEvent.event?.codeName === BizEvents.FLOW_STARTED,
  );

  if (!eventList || !content || !version) {
    return <></>;
  }

  const bizEvents = session?.bizEvent?.sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const answerEvents = session?.bizEvent?.filter(
    (bizEvent) => bizEvent.event?.codeName === BizEvents.QUESTION_ANSWERED,
  );

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
          <div className="border-b flex flex-col">
            <span className="text-sm text-foreground/60">User</span>
            <Link
              className="text-primary"
              to={`/env/${environmentId}/user/${session?.bizUser?.id}`}
            >
              {session?.bizUser?.data?.name ?? 'Unnamed user'}
            </Link>
          </div>
          <div className="border-b flex flex-col ">
            <span className="text-sm text-foreground/60 capitalize">{content.type}</span>
            <Link
              className=" text-primary"
              to={`/env/${environmentId}/${content.type}s/${session?.content?.id}/detail`}
            >
              {session?.content?.name}
            </Link>
          </div>
          <div className="border-b flex flex-col">
            <span className="text-sm text-foreground/60">Version</span>
            <Link
              className="text-primary"
              to={`/env/${environmentId}/flows/${session?.content?.id}/versions`}
            >
              V{session?.version?.sequence}
            </Link>
          </div>
          <div className="border-b flex flex-col">
            <span className="text-sm text-foreground/60">Started</span>
            <span>
              {session?.createdAt && formatDistanceToNow(new Date(session?.createdAt))} ago
            </span>
          </div>
          <div className="border-b flex flex-col">
            <span className="text-sm text-foreground/60">Start reason</span>
            <span>{startEvent?.data?.flow_start_reason}</span>
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
                  bizEvents.map((bizEvent: BizEvent) => (
                    <Fragment key={bizEvent.id}>
                      <TableRow
                        className="cursor-pointer  h-10 group"
                        onClick={() => handleRowClick(bizEvent.id)}
                      >
                        <TableCell className="w-1/4">
                          {format(new Date(bizEvent.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell className="flex justify-between items-center">
                          {bizEvent.event?.displayName}
                          {expandedRowId === bizEvent.id ? (
                            <ChevronUpIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRowId === bizEvent.id && (
                        <TableRow>
                          <TableCell colSpan={2} className="bg-gray-50 p-4">
                            <div className="text-sm">
                              {Object.entries(bizEvent.data || {}).map(([key, value]) => (
                                <div key={key} className="py-2 border-b flex flex-row">
                                  <span className="font-medium w-[200px] flex-none">
                                    {attributeList?.find((attr) => attr.codeName === key)
                                      ?.displayName || key}
                                  </span>
                                  <span className="grow">
                                    {key === 'question_type'
                                      ? contentTypesConfig.find(
                                          (config) => config.element.type === value,
                                        )?.name
                                      : typeof value === 'string'
                                        ? value
                                        : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="h-24 text-center">No results.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SessionItemContainer>
      </div>
    </>
  );
}

SessionDetailContent.displayName = 'SessionDetailContent';
