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
import { useQueryTooltipTargetMissingSessionsLazyQuery } from '@usertour-packages/shared-hooks';
import type { BizSession, BizEvent, AnalyticsViewsByStep } from '@usertour/types';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useAppContext } from '@/contexts/app-context';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { formatDistanceToNow, endOfDay, startOfDay } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { SpinnerIcon } from '@usertour-packages/icons';
import { BizEvents, EventAttributes } from '@usertour/types';
import { useInView } from 'react-intersection-observer';

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

// Stats summary component
const StatsSummary = ({ stepData }: { stepData: AnalyticsViewsByStep }) => {
  const uniqueTooltipTargetMissingCount = stepData.analytics.uniqueTooltipTargetMissingCount ?? 0;
  const totalViews = stepData.analytics.totalViews;
  const tooltipTargetMissingCount = stepData.analytics.tooltipTargetMissingCount ?? 0;
  const customSelector = stepData?.target?.customSelector ?? '';

  const failureRate =
    totalViews > 0 ? Math.round((tooltipTargetMissingCount / totalViews) * 100) : 0;
  return (
    <div className="flex items-center gap-8 py-4 border-b">
      <div className="w-48 h-48 bg-muted rounded-lg p-1 text-muted-foreground flex items-center justify-center overflow-hidden break-words">
        {customSelector}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold">{uniqueTooltipTargetMissingCount}</span>
        <span className="text-sm text-muted-foreground">Unique views</span>
        <span className="text-xs text-muted-foreground">{totalViews} in total</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold text-destructive">{failureRate}%</span>
        <span className="text-sm text-muted-foreground">Failure rate</span>
        <span className="text-xs text-muted-foreground">{failureRate}% in total</span>
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
  const { contentId, dateRange, timezone } = useAnalyticsContext();
  const { invoke: fetchSessions, loading } = useQueryTooltipTargetMissingSessionsLazyQuery();

  const [sessions, setSessions] = useState<BizSession[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ endCursor: null, hasNextPage: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    root: scrollContainer,
  });

  const buildQueryParams = useCallback(() => {
    if (!environment?.id || !dateRange?.from || !dateRange?.to) return null;
    return {
      environmentId: environment.id,
      contentId,
      startDate: startOfDay(new Date(dateRange.from)).toISOString(),
      endDate: endOfDay(new Date(dateRange.to)).toISOString(),
      timezone,
      stepCvid: stepData.cvid,
    };
  }, [environment?.id, dateRange, contentId, timezone, stepData.cvid]);

  const handleFetchResult = useCallback((data: any, append = false) => {
    if (!data) return;
    const newSessions = data.edges.map((edge: { node: BizSession }) => edge.node);
    setSessions((prev) => (append ? [...prev, ...newSessions] : newSessions));
    setPageInfo({
      endCursor: data.pageInfo.endCursor || null,
      hasNextPage: data.pageInfo.hasNextPage,
    });
  }, []);

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

  // Load initial data when dialog opens
  useEffect(() => {
    if (!open || !environment?.id || !dateRange?.from || !dateRange?.to) return;

    setSessions([]);
    setPageInfo({ endCursor: null, hasNextPage: false });

    const queryParams = {
      environmentId: environment.id,
      contentId,
      startDate: startOfDay(new Date(dateRange.from)).toISOString(),
      endDate: endOfDay(new Date(dateRange.to)).toISOString(),
      timezone,
      stepCvid: stepData.cvid,
    };

    fetchSessions(queryParams, { first: PAGE_SIZE }).then(handleFetchResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, environment?.id, contentId, timezone, stepData.cvid]);

  const isInitialLoading = loading && sessions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tooltip targets not found - {stepData.name}</DialogTitle>
        </DialogHeader>

        {isInitialLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div ref={setScrollContainer} className="flex-1 min-h-0 overflow-auto">
            <StatsSummary stepData={stepData} />

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
        )}
      </DialogContent>
    </Dialog>
  );
};

TooltipTargetMissingDialog.displayName = 'TooltipTargetMissingDialog';
