import { BizEvent, BizEvents, EventAttributes } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  ListSkeleton,
} from '@usertour/ui';
import {
  BannerIcon,
  ChecklistIcon,
  EventTrackerIcon,
  FlowIcon,
  LauncherIcon,
  ResourceCenterIcon,
  SpinnerIcon,
} from '@usertour/icons';
import {
  ActivityLogIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  GlobeIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { cn } from '@usertour/tailwind';
import { ReactNode, Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useCompanyActivityFeedQuery, useUserActivityFeedQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { sortEventDataEntries, getFieldValue } from '@/utils/session';
import { QuestionAnswer } from '@/components/sessions/session-detail';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

// Group events by date (YYYY-MM-DD)
function groupEventsByDate(events: BizEvent[]): Map<string, BizEvent[]> {
  const groups = new Map<string, BizEvent[]>();
  for (const event of events) {
    const dateKey = format(new Date(event.createdAt), 'yyyy-MM-dd');
    const existing = groups.get(dateKey) || [];
    existing.push(event);
    groups.set(dateKey, existing);
  }
  return groups;
}

// Format the date group header
function formatDateHeader(dateKey: string): string {
  return format(new Date(`${dateKey}T00:00:00`), 'MMM d, yyyy');
}

// Get event display name
function getEventDisplayName(event: BizEvent): string {
  if (event.event?.displayName) return event.event.displayName;
  if (event.event?.codeName) return event.event.codeName;
  return 'Unknown event';
}

type EventCategory =
  | 'flow'
  | 'checklist'
  | 'launcher'
  | 'banner'
  | 'resource_center'
  | 'event_tracker'
  | 'page'
  | 'custom';

function getEventCategory(event: BizEvent): EventCategory {
  const data = (event.data || {}) as Record<string, unknown>;

  if (data[EventAttributes.FLOW_ID]) return 'flow';
  if (data[EventAttributes.CHECKLIST_ID]) return 'checklist';
  if (data[EventAttributes.LAUNCHER_ID]) return 'launcher';
  if (data[EventAttributes.BANNER_ID]) return 'banner';
  if (data[EventAttributes.RESOURCE_CENTER_ID]) return 'resource_center';
  if (data[EventAttributes.EVENT_TRACKER_ID]) return 'event_tracker';
  if (event.event?.codeName === BizEvents.PAGE_VIEWED) return 'page';
  return 'custom';
}

const CATEGORY_ICON: Record<EventCategory, React.ComponentType<{ className?: string }>> = {
  flow: FlowIcon,
  checklist: ChecklistIcon,
  launcher: LauncherIcon,
  banner: BannerIcon,
  resource_center: ResourceCenterIcon,
  event_tracker: EventTrackerIcon,
  page: GlobeIcon,
  custom: ActivityLogIcon,
};

const CATEGORY_ICON_COLOR = 'text-muted-foreground';

// Extract inline descriptor: content name + sub-context (step/task/url)
function getEventDescriptor(event: BizEvent): { primary?: string; secondary?: string } {
  const data = (event.data || {}) as Record<string, unknown>;
  const category = getEventCategory(event);

  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v : typeof v === 'number' ? String(v) : undefined;

  switch (category) {
    case 'flow': {
      const primary = str(data[EventAttributes.FLOW_NAME]);
      const stepNumber = str(data[EventAttributes.FLOW_STEP_NUMBER]);
      const stepName = str(data[EventAttributes.FLOW_STEP_NAME]);
      const secondary = stepNumber
        ? `Step ${stepNumber}${stepName ? `: ${stepName}` : ''}`
        : stepName;
      return { primary, secondary };
    }
    case 'checklist':
      return {
        primary: str(data[EventAttributes.CHECKLIST_NAME]),
        secondary: str(data[EventAttributes.CHECKLIST_TASK_NAME]),
      };
    case 'launcher':
      return { primary: str(data[EventAttributes.LAUNCHER_NAME]) };
    case 'banner':
      return { primary: str(data[EventAttributes.BANNER_NAME]) };
    case 'resource_center':
      return {
        primary: str(data[EventAttributes.RESOURCE_CENTER_NAME]),
        secondary: str(data[EventAttributes.RESOURCE_CENTER_BLOCK_NAME]),
      };
    case 'event_tracker':
      return { primary: str(data[EventAttributes.EVENT_TRACKER_NAME]) };
    case 'page':
      return { primary: str(data[EventAttributes.PAGE_URL]) };
    default:
      return { primary: str(data.name) || str(data.title) };
  }
}

const CATEGORY_SESSION_ATTRIBUTE_KEY: Partial<Record<EventCategory, EventAttributes>> = {
  flow: EventAttributes.FLOW_SESSION_ID,
  checklist: EventAttributes.CHECKLIST_SESSION_ID,
  launcher: EventAttributes.LAUNCHER_SESSION_ID,
  banner: EventAttributes.BANNER_SESSION_ID,
  resource_center: EventAttributes.RESOURCE_CENTER_SESSION_ID,
};

function getFallbackSessionAttributeKey(event: BizEvent): EventAttributes | null {
  return CATEGORY_SESSION_ATTRIBUTE_KEY[getEventCategory(event)] ?? null;
}

const SESSION_LINK_LABEL = 'Session';

interface ActivityFeedRowProps {
  event: BizEvent;
  environmentId?: string;
  isExpanded: boolean;
  onToggle: () => void;
  renderTrailingContent?: (event: BizEvent) => ReactNode;
}

const SESSION_ID_ATTRIBUTES = new Set<string>([
  EventAttributes.FLOW_SESSION_ID,
  EventAttributes.LAUNCHER_SESSION_ID,
  EventAttributes.CHECKLIST_SESSION_ID,
  EventAttributes.BANNER_SESSION_ID,
  EventAttributes.RESOURCE_CENTER_SESSION_ID,
]);

const ActivityFeedRow = ({
  event,
  environmentId,
  isExpanded,
  onToggle,
  renderTrailingContent,
}: ActivityFeedRowProps) => {
  const time = format(new Date(event.createdAt), 'hh:mm a');
  const displayName = getEventDisplayName(event);
  const category = getEventCategory(event);
  const CategoryIcon = CATEGORY_ICON[category];
  const { primary: descriptorPrimary, secondary: descriptorSecondary } = getEventDescriptor(event);
  const hasDescriptor = !!(descriptorPrimary || descriptorSecondary);
  const hasEventData = !!(event.data && Object.keys(event.data).length > 0);
  const fallbackSessionAttributeKey =
    environmentId && event.bizSessionId ? getFallbackSessionAttributeKey(event) : null;
  const hasSessionLink = !!fallbackSessionAttributeKey;
  const hasDetails = hasEventData || hasSessionLink;
  const { attributeList } = useAttributeList();
  const copyWithToast = useCopyWithToast();

  return (
    <Fragment>
      <div
        className="flex min-w-0 items-center py-2.5 px-2 border-b gap-3 text-sm hover:bg-muted/30 cursor-pointer group"
        onClick={onToggle}
      >
        <div className="w-20 flex-none text-muted-foreground text-xs">{time}</div>
        <CategoryIcon className={cn('h-4 w-4 flex-none', CATEGORY_ICON_COLOR)} />
        <div className="font-medium flex-none">{displayName}</div>
        {hasDescriptor && (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-muted-foreground">
            {descriptorPrimary && (
              <span className="truncate max-w-[40%] shrink-0">{descriptorPrimary}</span>
            )}
            {descriptorPrimary && descriptorSecondary && (
              <span className="shrink-0 text-muted-foreground/60">·</span>
            )}
            {descriptorSecondary && <span className="truncate min-w-0">{descriptorSecondary}</span>}
          </div>
        )}
        {!hasDescriptor && <div className="flex-1" />}
        {renderTrailingContent && (
          <div className="flex-none text-muted-foreground text-xs">
            {renderTrailingContent(event)}
          </div>
        )}
        {hasDetails &&
          (isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 flex-none opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 flex-none opacity-0 group-hover:opacity-100 transition-opacity" />
          ))}
      </div>
      {isExpanded && hasDetails && (
        <div className="w-full min-w-0 overflow-hidden bg-muted/50 border-b text-sm">
          {hasEventData &&
            sortEventDataEntries(event.data || {}, attributeList || []).map(([key, value]) => {
              const displayValue = getFieldValue(key, value);
              const isSessionIdLink =
                SESSION_ID_ATTRIBUTES.has(key) &&
                environmentId &&
                typeof value === 'string' &&
                value;

              return (
                <div key={key} className="flex min-w-0 border-b last:border-b-0">
                  <span className="w-1/4 min-w-0 p-2 flex-none font-medium truncate">
                    {attributeList?.find((attr) => attr.codeName === key)?.displayName || key}
                  </span>
                  <div className="flex-1 min-w-0 overflow-hidden p-2">
                    {key === EventAttributes.LIST_ANSWER ? (
                      <div className="min-w-0 overflow-hidden break-words">
                        <QuestionAnswer answerEvent={event} />
                      </div>
                    ) : isSessionIdLink ? (
                      <Link
                        to={`/env/${environmentId}/session/${value}`}
                        className="inline-block max-w-full truncate text-primary hover:underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View session
                      </Link>
                    ) : (
                      <div className="group flex items-start min-w-0 gap-2">
                        <span className="block min-w-0 flex-1 break-all whitespace-pre-wrap">
                          {displayValue}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 rounded invisible group-hover:visible flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyWithToast(String(displayValue));
                          }}
                        >
                          <CopyIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          {hasSessionLink && (
            <div className="flex min-w-0 border-b last:border-b-0">
              <span className="w-1/4 min-w-0 p-2 flex-none font-medium truncate">
                {SESSION_LINK_LABEL}
              </span>
              <div className="flex-1 min-w-0 overflow-hidden p-2">
                <Link
                  to={`/env/${environmentId}/session/${event.bizSessionId}`}
                  className="inline-block max-w-full truncate text-primary hover:underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  View session
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
};

interface ActivityFeedListProps {
  events: BizEvent[];
  environmentId?: string;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  emptyMessage?: string;
  renderTrailingContent?: (event: BizEvent) => ReactNode;
}

export const ActivityFeedList = ({
  events,
  environmentId,
  loading,
  hasMore,
  loadMore,
  emptyMessage,
  renderTrailingContent,
}: ActivityFeedListProps) => {
  const { t } = useTranslation();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const dateGroups = groupEventsByDate(events);

  const handleRowToggle = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (loading && events.length === 0) {
    return <ListSkeleton length={5} />;
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img src="/images/rocket.png" alt="No events" className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-muted-foreground text-center">
          {emptyMessage || t('activityFeed.noEvents')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {Array.from(dateGroups.entries()).map(([dateKey, dayEvents]) => (
        <Fragment key={dateKey}>
          <div className="px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/40 border-b">
            {formatDateHeader(dateKey)}
          </div>
          {dayEvents.map((event) => (
            <ActivityFeedRow
              key={event.id}
              event={event}
              environmentId={environmentId}
              isExpanded={expandedRowId === event.id}
              onToggle={() => handleRowToggle(event.id)}
              renderTrailingContent={renderTrailingContent}
            />
          ))}
        </Fragment>
      ))}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <SpinnerIcon className="w-4 h-4 animate-spin" />
                <span>{t('activityFeed.loading')}</span>
              </div>
            ) : (
              t('activityFeed.loadMore')
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// Pre-fetched feed shape; callers source from
// `useUserActivityFeedQuery` / `useCompanyActivityFeedQuery` and pass
// the result in. Splitting data sourcing from rendering keeps this
// component re-usable across user/company detail pages without a
// Provider hop.
interface ActivityFeedProps {
  environmentId?: string;
  events: BizEvent[];
  loading: boolean;
  hasNextPage: boolean;
  totalCount: number;
  loadMore: () => void | Promise<void>;
  refetch: () => void;
  emptyMessage?: string;
  renderTrailingContent?: (event: BizEvent) => ReactNode;
}

export const ActivityFeed = ({
  environmentId,
  events,
  loading,
  hasNextPage,
  totalCount,
  loadMore,
  refetch,
  emptyMessage,
  renderTrailingContent,
}: ActivityFeedProps) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t('activityFeed.count', { count: totalCount })}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={refetch}
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
      <ActivityFeedList
        events={events}
        environmentId={environmentId}
        loading={loading}
        hasMore={hasNextPage}
        loadMore={loadMore}
        emptyMessage={emptyMessage}
        renderTrailingContent={renderTrailingContent}
      />
    </div>
  );
};

ActivityFeed.displayName = 'ActivityFeed';
ActivityFeedList.displayName = 'ActivityFeedList';

// Convenience wrappers that source data from the entity-specific
// activity feed hooks and forward it to <ActivityFeed />. Replaces the
// `UserActivityFeedProvider` / `CompanyActivityFeedProvider` pair.

interface UserActivityFeedProps {
  environmentId: string;
  userId: string;
  emptyMessage?: string;
  renderTrailingContent?: (event: BizEvent) => ReactNode;
}

export const UserActivityFeed = (props: UserActivityFeedProps) => {
  const { environmentId, userId, emptyMessage, renderTrailingContent } = props;
  const { events, loading, hasNextPage, totalCount, loadMore, refetch } = useUserActivityFeedQuery(
    environmentId,
    userId,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  return (
    <ActivityFeed
      environmentId={environmentId}
      events={events}
      loading={loading}
      hasNextPage={hasNextPage}
      totalCount={totalCount}
      loadMore={loadMore}
      refetch={refetch}
      emptyMessage={emptyMessage}
      renderTrailingContent={renderTrailingContent}
    />
  );
};

UserActivityFeed.displayName = 'UserActivityFeed';

interface CompanyActivityFeedProps {
  environmentId: string;
  companyId: string;
  emptyMessage?: string;
  renderTrailingContent?: (event: BizEvent) => ReactNode;
}

export const CompanyActivityFeed = (props: CompanyActivityFeedProps) => {
  const { environmentId, companyId, emptyMessage, renderTrailingContent } = props;
  const { events, loading, hasNextPage, totalCount, loadMore, refetch } =
    useCompanyActivityFeedQuery(environmentId, companyId, SHARED_CACHE_QUERY_OPTIONS);
  return (
    <ActivityFeed
      environmentId={environmentId}
      events={events}
      loading={loading}
      hasNextPage={hasNextPage}
      totalCount={totalCount}
      loadMore={loadMore}
      refetch={refetch}
      emptyMessage={emptyMessage}
      renderTrailingContent={renderTrailingContent}
    />
  );
};

CompanyActivityFeed.displayName = 'CompanyActivityFeed';
