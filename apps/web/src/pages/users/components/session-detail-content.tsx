import {
  ActivityLogIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuerySessionDetailQuery } from '@usertour-ui/shared-hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
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
import { ContentEditorElementType, contentTypesConfig } from '@usertour-ui/shared-editor';
import { QuestionStarRating } from '@/components/molecules/question';
import { Badge } from '@usertour-ui/badge';

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

// Add color utility functions from analytics-nps.tsx
const getDarkBarColor = (score: number, type: 'NPS' | 'SCALE') => {
  if (type === 'NPS') {
    if (score <= 6) return 'bg-red-500';
    if (score <= 8) return 'bg-yellow-500';
    return 'bg-green-500';
  }
  return 'bg-blue-700';
};

const ScaleAnswer = ({ value, type }: { value: number; type: 'NPS' | 'SCALE' }) => (
  <div className="flex items-center justify-start">
    <div
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-white',
        getDarkBarColor(value, type),
      )}
    >
      {value}
    </div>
  </div>
);

const MultipleChoiceAnswer = ({ answers }: { answers: string[] | string }) => {
  const answerList = Array.isArray(answers) ? answers : [answers];
  return (
    <ul className="list-disc pl-4">
      {answerList.map((answer: string, index: number) => (
        <li key={index}>{answer}</li>
      ))}
    </ul>
  );
};

const TextAnswer = ({ text }: { text: string }) => (
  <div className="whitespace-pre-line">{text}</div>
);

const QuestionAnswer = ({ answerEvent }: { answerEvent: BizEvent }) => {
  switch (answerEvent.data.question_type) {
    case ContentEditorElementType.STAR_RATING:
      return (
        <div className="flex flex-row gap-0.5">
          <QuestionStarRating
            maxLength={answerEvent.data.number_answer}
            score={answerEvent.data.number_answer}
          />
        </div>
      );
    case ContentEditorElementType.SCALE:
      return <ScaleAnswer value={answerEvent.data.number_answer} type="SCALE" />;
    case ContentEditorElementType.NPS:
      return <ScaleAnswer value={answerEvent.data.number_answer} type="NPS" />;
    case ContentEditorElementType.MULTIPLE_CHOICE:
      return <MultipleChoiceAnswer answers={answerEvent.data.list_answer} />;
    case ContentEditorElementType.MULTI_LINE_TEXT:
      return <TextAnswer text={answerEvent.data.text_answer} />;
    default:
      return <TextAnswer text={answerEvent.data.text_answer} />;
  }
};

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
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
            <div className="mb-2 flex flex-row items-center font-bold	">Response</div>
            <div className="flex flex-col items-center w-full h-full justify-center">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Question</TableHead>
                    <TableHead className="w-1/2">Answer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answerEvents ? (
                    answerEvents.map((answerEvent: BizEvent) => (
                      <Fragment key={answerEvent.id}>
                        <TableRow className=" h-10 ">
                          <TableCell>
                            <div className="flex flex-row gap-2 items-center ">
                              <span>{answerEvent.data.question_name}</span>
                              <Badge variant="secondary">
                                {
                                  contentTypesConfig.find(
                                    (config) =>
                                      config.element.type === answerEvent.data.question_type,
                                  )?.name
                                }
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <QuestionAnswer answerEvent={answerEvent} />
                          </TableCell>
                        </TableRow>
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
