'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour-packages/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import {
  useQueryTooltipTargetMissingSessionsLazyQuery,
  type StepAnalytics,
  type TooltipTargetMissingResponse,
} from '@usertour-packages/shared-hooks';
import type { BizSession, BizEvent, AnalyticsViewsByStep } from '@usertour/types';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useAppContext } from '@/contexts/app-context';
import type { DatePresetKey } from '@/utils/date-presets';
import type { DateRange } from 'react-day-picker';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { formatDistanceToNow, endOfDay, startOfDay } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { SpinnerIcon } from '@usertour-packages/icons';
import { BizEvents, EventAttributes } from '@usertour/types';
import { useInView } from 'react-intersection-observer';
import { calculateUniqueFailureRate, calculateTotalFailureRate } from '@/utils/analytics';
import { DateRangePicker } from '@/components/molecules/date-range-picker';
import { formatCompactNumber, shouldShowFullNumberTooltip } from '@/utils/common';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

interface TooltipTargetMissingDialogProps {
  stepData: AnalyticsViewsByStep;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
}

const PAGE_SIZE = 10;

// Extract event data from session
const getEventData = (session: BizSession) => {
  const event = session.bizEvent?.find(
    (e: BizEvent) => e.event?.codeName === BizEvents.TOOLTIP_TARGET_MISSING,
  );
  if (!event) return { url: '-', time: session.createdAt };
  const url = (event.data?.[EventAttributes.PAGE_URL] as string) || '-';
  return { url, time: event.createdAt };
};

// Component for displaying formatted numbers with optional tooltip for large values
const FormattedNumber = ({
  value,
  className,
  suffix,
}: {
  value: number;
  className?: string;
  suffix?: string;
}) => {
  const formatted = formatCompactNumber(value);
  const showTooltip = shouldShowFullNumberTooltip(value);

  const content = (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(className, 'cursor-help')}>
            {formatted}
            {suffix}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {value.toLocaleString('en-US')}
            {suffix}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Reusable stat item component
const StatItem = ({
  mainValue,
  totalValue,
  label,
  variant = 'primary',
  isPercentage = false,
}: {
  mainValue: number;
  totalValue: number;
  label: string;
  variant?: 'primary' | 'destructive';
  isPercentage?: boolean;
}) => {
  const colorClass = variant === 'primary' ? 'text-primary' : 'text-destructive';

  return (
    <div className="flex items-center gap-3">
      {isPercentage ? (
        <span className={`text-5xl font-semibold ${colorClass}`}>{mainValue}%</span>
      ) : (
        <FormattedNumber value={mainValue} className={`text-5xl font-semibold ${colorClass}`} />
      )}
      <div className="flex flex-col justify-center gap-1">
        <span className="text-base text-muted-foreground leading-tight whitespace-nowrap">
          {label}
        </span>
        <span className="text-sm leading-tight whitespace-nowrap">
          {isPercentage ? `${totalValue}%` : <FormattedNumber value={totalValue} />} in total
        </span>
      </div>
    </div>
  );
};

// Stats summary component
const StatsSummary = ({
  stepAnalytics,
  customSelector,
}: {
  stepAnalytics: StepAnalytics | null;
  customSelector: string;
}) => {
  const uniqueViews = stepAnalytics?.uniqueViews ?? 0;
  const totalViews = stepAnalytics?.totalViews ?? 0;
  const uniqueTooltipTargetMissingCount = stepAnalytics?.uniqueTooltipTargetMissingCount ?? 0;
  const tooltipTargetMissingCount = stepAnalytics?.tooltipTargetMissingCount ?? 0;

  const uniqueFailureRate = calculateUniqueFailureRate(
    uniqueTooltipTargetMissingCount,
    uniqueViews,
  );
  const totalFailureRate = calculateTotalFailureRate(tooltipTargetMissingCount, totalViews);

  return (
    <div className="flex items-center gap-8">
      <div className="w-56 h-36 bg-muted rounded-lg p-1 text-muted-foreground flex items-center justify-center overflow-hidden break-words shrink-0">
        {customSelector}
      </div>
      <div className="flex-1 flex items-center justify-evenly">
        <StatItem mainValue={uniqueViews} totalValue={totalViews} label="Unique views" />
        <StatItem
          mainValue={uniqueTooltipTargetMissingCount}
          totalValue={tooltipTargetMissingCount}
          label="Times not found"
          variant="destructive"
        />
        <StatItem
          mainValue={uniqueFailureRate}
          totalValue={totalFailureRate}
          label="Failure rate"
          variant="destructive"
          isPercentage
        />
      </div>
    </div>
  );
};

// Session row component
const SessionRow = ({
  session,
  environmentId,
}: {
  session: BizSession;
  environmentId: string;
}) => {
  const navigate = useNavigate();
  const { url, time } = getEventData(session);
  const bizUser = session.bizUser;
  const email = bizUser?.data?.email || '';
  const name = bizUser?.data?.name || '';
  const externalId = bizUser?.externalId || '';
  const primaryText = name || email || externalId;
  const showExternalIdOnSecondLine = externalId && (email || name);
  const sessionUrl = `/env/${environmentId}/session/${session.id}`;

  return (
    <TableRow>
      <TableCell>
        <Link
          to={`/env/${environmentId}/user/${session.bizUserId}`}
          className="flex items-center gap-2"
        >
          <UserAvatar email={email} name={name} size="sm" />
          <div className="flex flex-col">
            <span className="text-muted-foreground hover:text-primary hover:underline underline-offset-4">
              {primaryText}
            </span>
            {showExternalIdOnSecondLine && (
              <span className="text-muted-foreground/60 text-xs">{externalId}</span>
            )}
          </div>
        </Link>
      </TableCell>
      <TableCell className="cursor-pointer hover:text-primary" onClick={() => navigate(sessionUrl)}>
        <span className="truncate block max-w-xs" title={url}>
          {url}
        </span>
      </TableCell>
      <TableCell className="cursor-pointer hover:text-primary" onClick={() => navigate(sessionUrl)}>
        {formatDistanceToNow(new Date(time), { addSuffix: true })}
      </TableCell>
    </TableRow>
  );
};

// Loading spinner component
const LoadingSpinner = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => (
  <div className={`flex items-center justify-center ${size === 'lg' ? 'h-48' : ''}`}>
    <SpinnerIcon className={`animate-spin text-primary ${size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'}`} />
  </div>
);

// Empty state component
const EmptyState = () => (
  <TableRow>
    <TableCell colSpan={3} className="h-24 text-center">
      No results.
    </TableCell>
  </TableRow>
);

export const TooltipTargetMissingDialog = ({
  stepData,
  open,
  onOpenChange,
}: TooltipTargetMissingDialogProps) => {
  const { environment } = useAppContext();
  const {
    contentId,
    dateRange: globalDateRange,
    selectedPreset: globalSelectedPreset,
    timezone,
  } = useAnalyticsContext();
  const { invoke: fetchSessions, loading } = useQueryTooltipTargetMissingSessionsLazyQuery();

  // Local date range state (independent from global context)
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(globalDateRange);
  const [localSelectedPreset, setLocalSelectedPreset] = useState<DatePresetKey | null>(
    globalSelectedPreset,
  );

  const [sessions, setSessions] = useState<BizSession[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ endCursor: null, hasNextPage: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  // Local step analytics state - fetched from API based on local date range
  const [localStepAnalytics, setLocalStepAnalytics] = useState<StepAnalytics | null>(null);

  // Sync local state with global state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalDateRange(globalDateRange);
      setLocalSelectedPreset(globalSelectedPreset);
      // Reset step analytics - will be fetched from API
      setLocalStepAnalytics(null);
    }
  }, [open, globalDateRange, globalSelectedPreset]);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    root: scrollContainer,
  });

  const buildQueryParams = useCallback(() => {
    if (!environment?.id || !localDateRange?.from || !localDateRange?.to) return null;
    return {
      environmentId: environment.id,
      contentId,
      startDate: startOfDay(new Date(localDateRange.from)).toISOString(),
      endDate: endOfDay(new Date(localDateRange.to)).toISOString(),
      timezone,
      stepCvid: stepData.cvid,
    };
  }, [environment?.id, localDateRange, contentId, timezone, stepData.cvid]);

  const handleFetchResult = useCallback(
    (data: TooltipTargetMissingResponse | undefined, append = false) => {
      if (!data) return;
      const { sessions: sessionsData, stepAnalytics } = data;
      const newSessions = sessionsData.edges.map((edge: { node: BizSession }) => edge.node);
      setSessions((prev) => (append ? [...prev, ...newSessions] : newSessions));
      setPageInfo({
        endCursor: sessionsData.pageInfo.endCursor || null,
        hasNextPage: sessionsData.pageInfo.hasNextPage,
      });
      // Only update step analytics on initial fetch (not on load more)
      if (!append) {
        setLocalStepAnalytics(stepAnalytics);
      }
    },
    [],
  );

  const loadMore = useCallback(async () => {
    const queryParams = buildQueryParams();
    if (!queryParams || !pageInfo.endCursor || loadingMore) return;

    setLoadingMore(true);
    const result = await fetchSessions(queryParams, {
      first: PAGE_SIZE,
      after: pageInfo.endCursor,
    });
    handleFetchResult(result, true);
    setLoadingMore(false);
  }, [buildQueryParams, pageInfo.endCursor, loadingMore, fetchSessions, handleFetchResult]);

  // Load more when sentinel comes into view
  useEffect(() => {
    if (inView && pageInfo.hasNextPage && !loadingMore && !loading) {
      loadMore();
    }
  }, [inView, pageInfo.hasNextPage, loadingMore, loading, loadMore]);

  // Load initial data when dialog opens or local date range changes
  useEffect(() => {
    if (!open || !environment?.id || !localDateRange?.from || !localDateRange?.to) return;

    setIsRefetching(true);
    setSessions([]);
    setPageInfo({ endCursor: null, hasNextPage: false });

    const queryParams = {
      environmentId: environment.id,
      contentId,
      startDate: startOfDay(new Date(localDateRange.from)).toISOString(),
      endDate: endOfDay(new Date(localDateRange.to)).toISOString(),
      timezone,
      stepCvid: stepData.cvid,
    };

    fetchSessions(queryParams, { first: PAGE_SIZE })
      .then(handleFetchResult)
      .finally(() => setIsRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    environment?.id,
    contentId,
    timezone,
    stepData.cvid,
    localDateRange?.from,
    localDateRange?.to,
  ]);

  const isInitialLoading = (loading || isRefetching) && sessions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            Tooltip targets not found - Step {stepData.stepIndex + 1}. {stepData.name}
          </DialogTitle>
        </DialogHeader>

        {isInitialLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div ref={setScrollContainer} className="flex-1 min-h-0 overflow-auto">
            <div className="px-6 flex justify-end">
              <DateRangePicker
                dateRange={localDateRange}
                setDateRange={setLocalDateRange}
                selectedPreset={localSelectedPreset}
                setSelectedPreset={setLocalSelectedPreset}
              />
            </div>
            <div className="px-6">
              <StatsSummary
                stepAnalytics={localStepAnalytics}
                customSelector={stepData?.target?.customSelector ?? ''}
              />
            </div>

            <div className="p-6">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-1/3">User</TableHead>
                    <TableHead className="w-1/2">URL</TableHead>
                    <TableHead className="w-1/6">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        environmentId={environment?.id || ''}
                      />
                    ))
                  ) : (
                    <EmptyState />
                  )}
                </TableBody>
              </Table>

              {pageInfo.hasNextPage && (
                <div ref={sentinelRef} className="py-4">
                  {loadingMore && <LoadingSpinner size="sm" />}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

TooltipTargetMissingDialog.displayName = 'TooltipTargetMissingDialog';
