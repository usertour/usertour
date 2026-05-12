import {
  ActivityLogIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import {
  MoreButton,
  SectionBreadcrumbHeader,
} from '@/components/molecules/section-breadcrumb-header';
import { useQuerySessionDetailQuery } from '@usertour-packages/hooks';
import { BizEvent, BizEvents, ContentDataType, EventAttributes } from '@usertour/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import {
  BannerProgressColumn,
  ChecklistItemsColumn,
  LauncherProgressColumn,
  ResourceCenterProgressColumn,
} from '@/components/molecules/session';
import { FlowProgressColumn } from '@/components/molecules/session';
import { useEventListContext } from '@/contexts/event-list-context';
import { ChecklistProgressColumn } from '@/components/molecules/session';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
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

const groupBizEventsByDate = (events: BizEvent[]): Map<string, BizEvent[]> => {
  const groups = new Map<string, BizEvent[]>();
  for (const event of events) {
    const dateKey = format(new Date(event.createdAt), 'yyyy-MM-dd');
    const existing = groups.get(dateKey) || [];
    existing.push(event);
    groups.set(dateKey, existing);
  }
  return groups;
};

const formatActivityDateHeader = (dateKey: string): string =>
  format(new Date(`${dateKey}T00:00:00`), 'MMM d, yyyy');

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
  const { t } = useTranslation();
  const navigator = useNavigate();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const { attributeList } = useAttributeListContext();
  const { eventList } = useEventListContext();
  const content = session?.content;
  const contentType = content?.type;
  const version = session?.version;
  const bizUser = session?.bizUser;
  const userName =
    bizUser?.data?.name ||
    bizUser?.data?.email ||
    bizUser?.externalId ||
    t('users.sessions.detail.unnamedUser');

  const handleRowClick = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const startEvent = session?.bizEvent?.find(
    (bizEvent: BizEvent) =>
      bizEvent.event?.codeName === BizEvents.FLOW_STARTED ||
      bizEvent.event?.codeName === BizEvents.LAUNCHER_SEEN ||
      bizEvent.event?.codeName === BizEvents.CHECKLIST_STARTED ||
      bizEvent.event?.codeName === BizEvents.BANNER_SEEN ||
      bizEvent.event?.codeName === BizEvents.RESOURCE_CENTER_STARTED,
  );

  const endEvent = session?.bizEvent?.find(
    (bizEvent: BizEvent) =>
      bizEvent.event?.codeName === BizEvents.FLOW_ENDED ||
      bizEvent.event?.codeName === BizEvents.CHECKLIST_DISMISSED ||
      bizEvent.event?.codeName === BizEvents.LAUNCHER_DISMISSED ||
      bizEvent.event?.codeName === BizEvents.BANNER_DISMISSED ||
      bizEvent.event?.codeName === BizEvents.RESOURCE_CENTER_DISMISSED,
  );

  if (!eventList || !content || !version) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img
          src="/images/rocket.png"
          alt="Session not found"
          className="w-16 h-16 mb-4 opacity-50"
        />
        <p className="text-muted-foreground text-center">{t('users.sessions.detail.notFound')}</p>
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
  const startedAgo = session?.createdAt
    ? `${formatDistanceToNow(new Date(session.createdAt))} ${t('users.sessions.detail.relative.ago')}`
    : null;

  return (
    <>
      <SectionBreadcrumbHeader
        items={[
          { label: t('users.detail.breadcrumb'), to: `/env/${environmentId}/users` },
          {
            label: userName,
            to: bizUser?.id ? `/env/${environmentId}/user/${bizUser.id}` : undefined,
            className: 'max-w-[220px]',
          },
          { label: t('users.sessions.detail.breadcrumb') },
        ]}
        menu={
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
            <MoreButton aria-label={t('users.sessions.detail.actionsMenu')} />
          </SessionActionDropdownMenu>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-6 xl:p-8">
        {/* Identity header */}
        <div className="flex items-start gap-4 px-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
            <ActivityLogIcon className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground truncate">{content?.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 capitalize">{contentType}</span>
              {version?.sequence !== undefined && (
                <Link
                  to={`/env/${environmentId}/${routeContentTypes}/${content?.id}/versions`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  V{version.sequence + 1}
                </Link>
              )}
              {startedAgo && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t('users.sessions.detail.fields.started')} {startedAgo}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two-column content area */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          {/* Left column - primary content */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('users.sessions.detail.progress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contentType === ContentDataType.CHECKLIST && (
                  <div className="flex flex-col gap-8">
                    <ChecklistProgressColumn
                      original={session}
                      eventList={eventList}
                      version={version}
                    />
                    <ChecklistItemsColumn
                      original={session}
                      eventList={eventList}
                      version={version}
                    />
                  </div>
                )}
                {contentType === ContentDataType.FLOW && (
                  <FlowProgressColumn original={session} eventList={eventList} />
                )}
                {contentType === ContentDataType.LAUNCHER && (
                  <LauncherProgressColumn original={session} eventList={eventList} />
                )}
                {contentType === ContentDataType.BANNER && (
                  <BannerProgressColumn original={session} eventList={eventList} />
                )}
                {contentType === ContentDataType.RESOURCE_CENTER && (
                  <ResourceCenterProgressColumn original={session} eventList={eventList} />
                )}
              </CardContent>
            </Card>

            {questionAnswers && questionAnswers.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold">
                    {t('users.sessions.detail.response')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SessionResponse questions={questionAnswers} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('users.sessions.detail.activityFeed')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full text-sm">
                  {bizEvents && bizEvents.length > 0 ? (
                    Array.from(groupBizEventsByDate(bizEvents).entries()).map(
                      ([dateKey, dayEvents]) => (
                        <Fragment key={dateKey}>
                          <div className="px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/40 border-b">
                            {formatActivityDateHeader(dateKey)}
                          </div>
                          {dayEvents.map((bizEvent: BizEvent) => {
                            const displaySuffix = getEventDisplaySuffix(bizEvent, session);
                            return (
                              <Fragment key={bizEvent.id}>
                                <div
                                  className="flex items-center cursor-pointer group border-b hover:bg-muted leading-6"
                                  onClick={() => handleRowClick(bizEvent.id)}
                                >
                                  <span className="w-1/4 p-2 flex-none tabular-nums">
                                    {format(new Date(bizEvent.createdAt), 'HH:mm:ss')}
                                  </span>
                                  <div className="flex-1 min-w-0 flex justify-between items-center gap-2 p-2">
                                    <span className="truncate">
                                      {bizEvent.event?.displayName}
                                      {displaySuffix && (
                                        <span className="text-muted-foreground ml-2">
                                          {displaySuffix}
                                        </span>
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
                          })}
                        </Fragment>
                      ),
                    )
                  ) : (
                    <div className="h-24 flex items-center justify-center text-muted-foreground">
                      {t('users.sessions.detail.noEvents')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - session info (sticky on xl) */}
          <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[420px] xl:self-start">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('users.sessions.detail.sessionInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col text-sm">
                  <div className="flex min-w-0 gap-2 border-b py-2 leading-6">
                    <div className="w-2/5 min-w-0 break-words font-medium">
                      {t('users.sessions.detail.fields.user')}
                    </div>
                    <div className="w-3/5 min-w-0 break-words">
                      {bizUser?.id ? (
                        <Link
                          to={`/env/${environmentId}/user/${bizUser.id}`}
                          // block + truncate so overflow:hidden actually
                          // applies — Link is an <a> (inline by default),
                          // and inline elements ignore overflow rules,
                          // letting unbroken long names spill past the card.
                          className="block truncate text-primary hover:underline underline-offset-2"
                          title={userName}
                        >
                          {userName}
                        </Link>
                      ) : (
                        userName
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2 border-b py-2 leading-6">
                    <div className="w-2/5 min-w-0 break-words font-medium capitalize">
                      {contentType}
                    </div>
                    <div className="w-3/5 min-w-0 break-words">
                      <Link
                        to={`/env/${environmentId}/${routeContentTypes}/${content?.id}/detail`}
                        className="block truncate text-primary hover:underline underline-offset-2"
                        title={content?.name ?? undefined}
                      >
                        {content?.name}
                      </Link>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2 border-b py-2 leading-6">
                    <div className="w-2/5 min-w-0 break-words font-medium">
                      {t('users.sessions.detail.fields.version')}
                    </div>
                    <div className="w-3/5 min-w-0 break-words">
                      <Link
                        to={`/env/${environmentId}/${routeContentTypes}/${content?.id}/versions`}
                        className="text-primary hover:underline underline-offset-2"
                      >
                        V{version?.sequence + 1}
                      </Link>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2 border-b py-2 leading-6">
                    <div className="w-2/5 min-w-0 break-words font-medium">
                      {t('users.sessions.detail.fields.started')}
                    </div>
                    <div className="w-3/5 min-w-0 break-words">{startedAgo}</div>
                  </div>
                  <div
                    className={
                      endEvent
                        ? 'flex min-w-0 gap-2 border-b py-2 leading-6'
                        : 'flex min-w-0 gap-2 py-2 leading-6'
                    }
                  >
                    <div className="w-2/5 min-w-0 break-words font-medium">
                      {t('users.sessions.detail.fields.startReason')}
                    </div>
                    <div className="w-3/5 min-w-0 break-words">{startReason}</div>
                  </div>
                  {endEvent && (
                    <div className="flex min-w-0 gap-2 py-2 leading-6">
                      <div className="w-2/5 min-w-0 break-words font-medium">
                        {t('users.sessions.detail.fields.endReason')}
                      </div>
                      <div className="w-3/5 min-w-0 break-words">{endReason}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

// Main export component
export function SessionDetailContent(props: SessionDetailContentProps) {
  return <SessionDetailContentWithLoading {...props} />;
}

SessionDetailContent.displayName = 'SessionDetailContent';
