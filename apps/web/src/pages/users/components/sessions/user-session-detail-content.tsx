import {
  ActivityLogIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { MoreButton, SectionBreadcrumbHeader } from '@/components/section-breadcrumb-header';
import {
  useListAttributesQuery,
  useListEventsQuery,
  useQuerySessionDetailQuery,
} from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import {
  type Attribute,
  AttributeBizTypes,
  type BizEvent,
  BizEvents,
  type BizSession,
  ContentDataType,
  EventAttributes,
} from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import { format, formatDistanceToNow } from 'date-fns';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BannerProgressColumn,
  ChecklistItemsColumn,
  ChecklistProgressColumn,
  FlowProgressColumn,
  LauncherProgressColumn,
  ResourceCenterProgressColumn,
} from '@/components/sessions/session';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ContentLoading,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { SessionActionDropdownMenu } from '@/components/sessions/session-action-dropmenu';
import { QuestionAnswer, SessionResponse } from '@/components/sessions/session-detail';
import {
  getEndReasonTitle,
  getEventDisplaySuffix,
  getFieldValue,
  getOrderedQuestionAnswers,
  getStartReasonTitle,
  sortEventDataEntries,
} from '@/utils/session';

const START_EVENT_CODES = new Set<string>([
  BizEvents.FLOW_STARTED,
  BizEvents.LAUNCHER_SEEN,
  BizEvents.CHECKLIST_STARTED,
  BizEvents.BANNER_SEEN,
  BizEvents.RESOURCE_CENTER_STARTED,
]);

const END_EVENT_CODES = new Set<string>([
  BizEvents.FLOW_ENDED,
  BizEvents.CHECKLIST_DISMISSED,
  BizEvents.LAUNCHER_DISMISSED,
  BizEvents.BANNER_DISMISSED,
  BizEvents.RESOURCE_CENTER_DISMISSED,
]);

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

const userDisplayName = (session: BizSession, fallback: string): string => {
  const bizUser = session.bizUser;
  return bizUser?.data?.name || bizUser?.data?.email || bizUser?.externalId || fallback;
};

const SessionIdentityHeader = ({
  session,
  environmentId,
}: { session: BizSession; environmentId: string }) => {
  const { t } = useTranslation();
  const { content, version } = session;
  const startedAgo = session.createdAt
    ? `${formatDistanceToNow(new Date(session.createdAt))} ${t('users.sessions.detail.relative.ago')}`
    : null;
  const versionLabel = version?.sequence !== undefined ? `V${version.sequence + 1}` : null;
  const routeContentTypes = `${content?.type}s`;

  // Soft-deleted content: keep the row but visually mark it and drop
  // the link — the live detail page would 404.
  return (
    <div className="flex items-start gap-4 px-1">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
        <ActivityLogIcon className="h-5 w-5 text-foreground/70" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h1
            className={`text-xl font-semibold truncate ${
              content?.deleted ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}
          >
            {content?.name}
          </h1>
          {content?.deleted && (
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
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 capitalize">{content?.type}</span>
          {versionLabel &&
            (content?.deleted ? (
              <span className="inline-flex items-center gap-1.5">{versionLabel}</span>
            ) : (
              <Link
                to={`/env/${environmentId}/${routeContentTypes}/${content?.id}/versions`}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                {versionLabel}
              </Link>
            ))}
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
  );
};

const SessionProgressCard = ({
  session,
  eventList,
}: { session: BizSession; eventList: import('@usertour/types').Event[] }) => {
  const { t } = useTranslation();
  const { content, version } = session;
  if (!content || !version) return null;

  const renderInner = () => {
    switch (content.type) {
      case ContentDataType.CHECKLIST:
        return (
          <div className="flex flex-col gap-8">
            <ChecklistProgressColumn original={session} eventList={eventList} version={version} />
            <ChecklistItemsColumn original={session} eventList={eventList} version={version} />
          </div>
        );
      case ContentDataType.FLOW:
        return <FlowProgressColumn original={session} eventList={eventList} />;
      case ContentDataType.LAUNCHER:
        return <LauncherProgressColumn original={session} eventList={eventList} />;
      case ContentDataType.BANNER:
        return <BannerProgressColumn original={session} eventList={eventList} />;
      case ContentDataType.RESOURCE_CENTER:
        return <ResourceCenterProgressColumn original={session} eventList={eventList} />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">
          {t('users.sessions.detail.progress')}
        </CardTitle>
      </CardHeader>
      <CardContent>{renderInner()}</CardContent>
    </Card>
  );
};

interface ActivityFeedRowProps {
  bizEvent: BizEvent;
  session: BizSession;
  attributeList: Attribute[] | undefined;
  expanded: boolean;
  onToggle: () => void;
}

const ActivityFeedRow = ({
  bizEvent,
  session,
  attributeList,
  expanded,
  onToggle,
}: ActivityFeedRowProps) => {
  const displaySuffix = getEventDisplaySuffix(bizEvent, session);
  const ChevronIcon = expanded ? ChevronUpIcon : ChevronDownIcon;
  return (
    <>
      <div
        className="flex items-center cursor-pointer group border-b hover:bg-muted leading-6"
        onClick={onToggle}
      >
        <span className="w-1/4 p-2 flex-none tabular-nums">
          {format(new Date(bizEvent.createdAt), 'HH:mm:ss')}
        </span>
        <div className="flex-1 min-w-0 flex justify-between items-center gap-2 p-2">
          <span className="truncate">
            {bizEvent.event?.displayName}
            {displaySuffix && <span className="text-muted-foreground ml-2">{displaySuffix}</span>}
          </span>
          <ChevronIcon className="h-4 w-4 flex-none opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {expanded && bizEvent.data && (
        <div className="bg-muted/50 border-b text-sm">
          {sortEventDataEntries(bizEvent.data, attributeList || []).map(([key, value]) => (
            <div key={key} className="flex border-b last:border-b-0">
              <span className="w-1/4 p-2 flex-none font-medium truncate">
                {attributeList?.find((attr) => attr.codeName === key)?.displayName || key}
              </span>
              <div className="flex-1 min-w-0 p-2">
                {key === EventAttributes.LIST_ANSWER ? (
                  <div className="overflow-hidden">
                    <QuestionAnswer answerEvent={bizEvent} />
                  </div>
                ) : (
                  <span className="block truncate">{getFieldValue(key, value)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

interface SessionActivityFeedProps {
  bizEvents: BizEvent[];
  session: BizSession;
  attributeList: Attribute[] | undefined;
}

const SessionActivityFeed = ({ bizEvents, session, attributeList }: SessionActivityFeedProps) => {
  const { t } = useTranslation();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (bizEvents.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-muted-foreground">
        {t('users.sessions.detail.noEvents')}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">
          {t('users.sessions.detail.activityFeed')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full text-sm">
          {Array.from(groupBizEventsByDate(bizEvents).entries()).map(([dateKey, dayEvents]) => (
            <Fragment key={dateKey}>
              <div className="px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/40 border-b">
                {formatActivityDateHeader(dateKey)}
              </div>
              {dayEvents.map((bizEvent) => (
                <ActivityFeedRow
                  key={bizEvent.id}
                  bizEvent={bizEvent}
                  session={session}
                  attributeList={attributeList}
                  expanded={expandedRowId === bizEvent.id}
                  onToggle={() =>
                    setExpandedRowId(expandedRowId === bizEvent.id ? null : bizEvent.id)
                  }
                />
              ))}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface SessionInfoRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  isLast?: boolean;
}

const SessionInfoRow = ({ label, children, isLast = false }: SessionInfoRowProps) => (
  <div className={`flex min-w-0 gap-2 ${isLast ? '' : 'border-b'} py-2 leading-6`}>
    <div className="w-2/5 min-w-0 break-words font-medium">{label}</div>
    <div className="w-3/5 min-w-0 break-words">{children}</div>
  </div>
);

interface SessionInfoCardProps {
  session: BizSession;
  environmentId: string;
  startReason: string | null;
  endReason: string | null;
  hasEndEvent: boolean;
  startedAgo: string | null;
}

const SessionInfoCard = ({
  session,
  environmentId,
  startReason,
  endReason,
  hasEndEvent,
  startedAgo,
}: SessionInfoCardProps) => {
  const { t } = useTranslation();
  const { content, version, bizUser } = session;
  const routeContentTypes = `${content?.type}s`;
  const userName = userDisplayName(session, t('users.sessions.detail.unnamedUser'));

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">
          {t('users.sessions.detail.sessionInfo')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col text-sm">
          <SessionInfoRow label={t('users.sessions.detail.fields.user')}>
            {bizUser?.id ? (
              // block + truncate so overflow:hidden actually applies — Link is
              // an <a> (inline by default), and inline elements ignore overflow,
              // letting unbroken long names spill past the card.
              <Link
                to={`/env/${environmentId}/user/${bizUser.id}`}
                className="block truncate text-primary hover:underline underline-offset-2"
                title={userName}
              >
                {userName}
              </Link>
            ) : (
              userName
            )}
          </SessionInfoRow>
          <SessionInfoRow label={<span className="capitalize">{content?.type}</span>}>
            {content?.deleted ? (
              <span className="block truncate" title={content?.name ?? undefined}>
                {content?.name}
              </span>
            ) : (
              <Link
                to={`/env/${environmentId}/${routeContentTypes}/${content?.id}/detail`}
                className="block truncate text-primary hover:underline underline-offset-2"
                title={content?.name ?? undefined}
              >
                {content?.name}
              </Link>
            )}
          </SessionInfoRow>
          <SessionInfoRow label={t('users.sessions.detail.fields.version')}>
            {content?.deleted ? (
              <span>V{(version?.sequence ?? 0) + 1}</span>
            ) : (
              <Link
                to={`/env/${environmentId}/${routeContentTypes}/${content?.id}/versions`}
                className="text-primary hover:underline underline-offset-2"
              >
                V{(version?.sequence ?? 0) + 1}
              </Link>
            )}
          </SessionInfoRow>
          <SessionInfoRow label={t('users.sessions.detail.fields.started')}>
            {startedAgo}
          </SessionInfoRow>
          <SessionInfoRow
            label={t('users.sessions.detail.fields.startReason')}
            isLast={!hasEndEvent}
          >
            {startReason}
          </SessionInfoRow>
          {hasEndEvent && (
            <SessionInfoRow label={t('users.sessions.detail.fields.endReason')} isLast>
              {endReason}
            </SessionInfoRow>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SessionDetailContentInner = ({
  environmentId,
  session,
  refetch,
}: {
  environmentId: string;
  session: BizSession;
  refetch: () => void;
}) => {
  const { t } = useTranslation();
  const navigator = useNavigate();
  const { project } = useAppContext();
  // Direct cache-and-network queries (not the shared context) so event /
  // attribute definitions the SDK created at runtime show on a fresh visit
  // without a manual reload.
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !project?.id },
  );
  const { eventList, loading: eventLoading } = useListEventsQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );

  const content = session?.content;
  const version = session?.version;

  if (eventLoading && !eventList) {
    return <ContentLoading message={t('common.loading')} />;
  }

  // Not-found is determined by session payload alone — `eventList` is a
  // secondary lookup for event display names. When the query is skipped
  // (project not hydrated yet on a deep link) eventList is undefined
  // but the session itself can still be valid.
  if (!content || !version) {
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

  const safeEventList = eventList ?? [];

  const bizEvents = (session?.bizEvent ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const startEvent = session?.bizEvent?.find((e) =>
    e.event?.codeName ? START_EVENT_CODES.has(e.event.codeName) : false,
  );
  const endEvent = session?.bizEvent?.find((e) =>
    e.event?.codeName ? END_EVENT_CODES.has(e.event.codeName) : false,
  );
  const questionAnswers = getOrderedQuestionAnswers(session);
  const startReason = getStartReasonTitle(content.type as ContentDataType, startEvent);
  const endReason = getEndReasonTitle(content.type as ContentDataType, endEvent);
  const startedAgo = session?.createdAt
    ? `${formatDistanceToNow(new Date(session.createdAt))} ${t('users.sessions.detail.relative.ago')}`
    : null;
  const userName = userDisplayName(session, t('users.sessions.detail.unnamedUser'));

  return (
    <>
      <SectionBreadcrumbHeader
        items={[
          { label: t('users.detail.breadcrumb'), to: `/env/${environmentId}/users` },
          {
            label: userName,
            to: session.bizUser?.id
              ? `/env/${environmentId}/user/${session.bizUser.id}`
              : undefined,
            className: 'max-w-[220px]',
          },
          { label: t('users.sessions.detail.breadcrumb') },
        ]}
        menu={
          <SessionActionDropdownMenu
            session={session}
            showViewDetails={false}
            showViewResponse={false}
            onDeleteSuccess={() => navigator(`/env/${environmentId}/users`)}
            onEndSuccess={() => refetch()}
          >
            <MoreButton aria-label={t('users.sessions.detail.actionsMenu')} />
          </SessionActionDropdownMenu>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-6 xl:p-8">
        <SessionIdentityHeader session={session} environmentId={environmentId} />

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <SessionProgressCard session={session} eventList={safeEventList} />
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
            <SessionActivityFeed
              bizEvents={bizEvents}
              session={session}
              attributeList={attributeList}
            />
          </div>

          <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[420px] xl:self-start">
            <SessionInfoCard
              session={session}
              environmentId={environmentId}
              startReason={startReason}
              endReason={endReason}
              hasEndEvent={!!endEvent}
              startedAgo={startedAgo}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export function UserSessionDetailContent({ environmentId, sessionId }: SessionDetailContentProps) {
  const { session, loading, refetch } = useQuerySessionDetailQuery(sessionId);
  const { t } = useTranslation();

  if (loading) {
    return <ContentLoading message={t('common.loading')} />;
  }
  if (!session) {
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

  return (
    <SessionDetailContentInner environmentId={environmentId} session={session} refetch={refetch} />
  );
}

UserSessionDetailContent.displayName = 'UserSessionDetailContent';
