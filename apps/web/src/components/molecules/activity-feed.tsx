import { BizEvent, EventAttributes } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Button } from '@usertour-packages/button';
import { SpinnerIcon } from '@usertour-packages/icons';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, ReloadIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { ReactNode, Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivityFeedContext } from '@/contexts/activity-feed-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { sortEventDataEntries, getFieldValue } from '@/utils/session';
import { QuestionAnswer } from '@/components/molecules/session-detail';
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

// Get event color indicator
function getEventColor(event: BizEvent): string {
  if (event.event?.predefined) {
    return 'bg-blue-500';
  }
  return 'bg-green-500';
}

// Extract useful context from event data
function getEventContext(event: BizEvent): string | null {
  if (!event.data) return null;
  const data = event.data as Record<string, unknown>;

  if (data.url) return String(data.url);
  if (data.path) return String(data.path);
  if (data.page) return String(data.page);
  if (data.name) return String(data.name);
  if (data.title) return String(data.title);

  return null;
}

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
  const context = getEventContext(event);
  const colorClass = getEventColor(event);
  const hasEventData = !!(event.data && Object.keys(event.data).length > 0);
  const hasSessionLink = !!(environmentId && event.bizSessionId);
  const hasDetails = hasEventData || hasSessionLink;
  const { attributeList } = useAttributeListContext();
  const copyWithToast = useCopyWithToast();

  return (
    <Fragment>
      <div
        className="flex items-center py-2.5 px-2 border-b gap-3 text-sm hover:bg-muted/30 cursor-pointer group"
        onClick={onToggle}
      >
        <div className="w-20 flex-none text-muted-foreground text-xs">{time}</div>
        <div className={cn('w-2 h-2 rounded-full flex-none', colorClass)} />
        <div className="font-medium flex-none">{displayName}</div>
        {context && <div className="text-muted-foreground truncate min-w-0 flex-1">{context}</div>}
        {!context && <div className="flex-1" />}
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
        <div className="bg-muted/50 border-b text-sm">
          {hasSessionLink && (
            <div className="flex border-b last:border-b-0">
              <span className="w-1/4 p-2 flex-none font-medium truncate">Session</span>
              <div className="flex-1 min-w-0 p-2">
                <Link
                  to={`/env/${environmentId}/session/${event.bizSessionId}`}
                  className="text-primary hover:underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  View session
                </Link>
              </div>
            </div>
          )}
          {hasEventData &&
            sortEventDataEntries(event.data || {}, attributeList || []).map(([key, value]) => {
              const displayValue = getFieldValue(key, value);
              const isSessionIdLink =
                SESSION_ID_ATTRIBUTES.has(key) &&
                environmentId &&
                typeof value === 'string' &&
                value;

              return (
                <div key={key} className="flex border-b last:border-b-0">
                  <span className="w-1/4 p-2 flex-none font-medium truncate">
                    {attributeList?.find((attr) => attr.codeName === key)?.displayName || key}
                  </span>
                  <div className="flex-1 min-w-0 p-2">
                    {key === EventAttributes.LIST_ANSWER ? (
                      <div className="overflow-hidden">
                        <QuestionAnswer answerEvent={event} />
                      </div>
                    ) : isSessionIdLink ? (
                      <Link
                        to={`/env/${environmentId}/session/${value}`}
                        className="text-primary hover:underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View session
                      </Link>
                    ) : (
                      <div className="group flex items-start min-w-0 gap-2">
                        <span className="block truncate flex-1">{displayValue}</span>
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

// Convenience component that self-sources from context
interface ActivityFeedProps {
  environmentId?: string;
  emptyMessage?: string;
  renderTrailingContent?: (event: BizEvent) => ReactNode;
}

export const ActivityFeed = ({
  environmentId,
  emptyMessage,
  renderTrailingContent,
}: ActivityFeedProps) => {
  const { events, loading, hasNextPage, loadMore, refetch, totalCount } = useActivityFeedContext();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 && `${totalCount} events`}
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
