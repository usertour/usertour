'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour-packages/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { queryTooltipTargetMissingSessions } from '@usertour-packages/gql';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useAppContext } from '@/contexts/app-context';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { endOfDay, startOfDay } from 'date-fns';
import { SpinnerIcon } from '@usertour-packages/icons';
import { BizEvents, EventAttributes } from '@usertour/types';
import { useInView } from 'react-intersection-observer';

interface TooltipTargetMissingSession {
  id: string;
  createdAt: string;
  bizUserId: string;
  bizUser: {
    externalId: string;
    data: {
      email?: string;
      name?: string;
    };
  };
  bizEvent: Array<{
    id: string;
    createdAt: string;
    data: Record<string, unknown>;
    event: {
      codeName: string;
    };
  }>;
}

export interface TooltipTargetMissingStepData {
  cvid: string;
  name: string;
  tooltipTargetMissingCount: number;
  uniqueTooltipTargetMissingCount: number;
  totalViews: number;
}

interface TooltipTargetMissingDialogProps {
  stepData: TooltipTargetMissingStepData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 10;

export const TooltipTargetMissingDialog = ({
  stepData,
  open,
  onOpenChange,
}: TooltipTargetMissingDialogProps) => {
  const { environment } = useAppContext();
  const { contentId, dateRange, timezone } = useAnalyticsContext();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TooltipTargetMissingSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [fetchSessions, { loading }] = useLazyQuery(queryTooltipTargetMissingSessions, {
    fetchPolicy: 'network-only',
  });

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  const failureRate =
    stepData.totalViews > 0
      ? Math.round((stepData.tooltipTargetMissingCount / stepData.totalViews) * 100)
      : 0;

  const loadMore = useCallback(async () => {
    if (!environment?.id || !dateRange?.from || !dateRange?.to || !nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    const result = await fetchSessions({
      variables: {
        first: PAGE_SIZE,
        after: nextCursor,
        query: {
          environmentId: environment.id,
          contentId,
          startDate: startOfDay(new Date(dateRange.from)).toISOString(),
          endDate: endOfDay(new Date(dateRange.to)).toISOString(),
          timezone,
          stepCvid: stepData.cvid,
        },
        orderBy: {
          field: 'createdAt',
          direction: 'desc',
        },
      },
    });

    if (result.data?.queryTooltipTargetMissingSessions) {
      const data = result.data.queryTooltipTargetMissingSessions;
      const newSessions = data.edges.map(
        (edge: { node: TooltipTargetMissingSession }) => edge.node,
      );
      setSessions((prev) => [...prev, ...newSessions]);
      setNextCursor(data.pageInfo.endCursor || null);
      setHasNextPage(data.pageInfo.hasNextPage);
    }
    setLoadingMore(false);
  }, [
    environment?.id,
    dateRange,
    contentId,
    timezone,
    stepData.cvid,
    fetchSessions,
    nextCursor,
    loadingMore,
  ]);

  // Load more when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage && !loadingMore && !loading) {
      loadMore();
    }
  }, [inView, hasNextPage, loadingMore, loading, loadMore]);

  // Load initial data when dialog opens
  useEffect(() => {
    if (open) {
      setSessions([]);
      setNextCursor(null);
      setHasNextPage(false);
      if (environment?.id && dateRange?.from && dateRange?.to) {
        fetchSessions({
          variables: {
            first: PAGE_SIZE,
            query: {
              environmentId: environment.id,
              contentId,
              startDate: startOfDay(new Date(dateRange.from)).toISOString(),
              endDate: endOfDay(new Date(dateRange.to)).toISOString(),
              timezone,
              stepCvid: stepData.cvid,
            },
            orderBy: {
              field: 'createdAt',
              direction: 'desc',
            },
          },
        }).then((result) => {
          if (result.data?.queryTooltipTargetMissingSessions) {
            const data = result.data.queryTooltipTargetMissingSessions;
            setSessions(data.edges.map((edge: { node: TooltipTargetMissingSession }) => edge.node));
            setNextCursor(data.pageInfo.endCursor || null);
            setHasNextPage(data.pageInfo.hasNextPage);
          }
        });
      }
    }
  }, [open, environment?.id, dateRange, contentId, timezone, stepData.cvid, fetchSessions]);

  const getEventData = (session: TooltipTargetMissingSession) => {
    const event = session.bizEvent?.find(
      (e) => e.event?.codeName === BizEvents.TOOLTIP_TARGET_MISSING,
    );
    if (!event) return { url: '-', time: session.createdAt };

    const url = (event.data?.[EventAttributes.PAGE_URL] as string) || '-';
    return { url, time: event.createdAt };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tooltip Target Missing - {stepData.name}</DialogTitle>
        </DialogHeader>

        {/* Stats summary */}
        <div className="flex items-center gap-8 py-4 border-b">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold">
              {stepData.uniqueTooltipTargetMissingCount}
            </span>
            <span className="text-sm text-muted-foreground">Unique views</span>
            <span className="text-xs text-muted-foreground">
              {stepData.tooltipTargetMissingCount} in total
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-destructive">{failureRate}%</span>
            <span className="text-sm text-muted-foreground">Failure rate</span>
            <span className="text-xs text-muted-foreground">{failureRate}% in total</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">User</TableHead>
                    <TableHead className="w-1/3">URL</TableHead>
                    <TableHead className="w-1/3">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length > 0 ? (
                    sessions.map((session) => {
                      const { url, time } = getEventData(session);
                      const bizUser = session.bizUser;
                      const email = bizUser?.data?.email || '';
                      const name = bizUser?.data?.name || '';
                      const externalId = bizUser?.externalId || '';
                      const primaryText = name || email || externalId;
                      const showExternalIdOnSecondLine = externalId && (email || name);

                      const sessionUrl = `/env/${environment?.id}/session/${session.id}`;

                      return (
                        <TableRow key={session.id}>
                          <TableCell>
                            <Link
                              to={`/env/${environment?.id}/user/${session.bizUserId}`}
                              className="flex items-center gap-2"
                            >
                              <UserAvatar email={email} name={name} size="sm" />
                              <div className="flex flex-col">
                                <span className="text-muted-foreground hover:text-primary hover:underline underline-offset-4">
                                  {primaryText}
                                </span>
                                {showExternalIdOnSecondLine && (
                                  <span className="text-muted-foreground/60 text-xs">
                                    {externalId}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell
                            className="cursor-pointer hover:text-primary"
                            onClick={() => navigate(sessionUrl)}
                          >
                            <span className="truncate block max-w-xs" title={url}>
                              {url}
                            </span>
                          </TableCell>
                          <TableCell
                            className="cursor-pointer hover:text-primary"
                            onClick={() => navigate(sessionUrl)}
                          >
                            {formatDistanceToNow(new Date(time), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Sentinel for infinite scroll */}
              {hasNextPage && (
                <div ref={sentinelRef} className="flex items-center justify-center py-4">
                  {loadingMore && <SpinnerIcon className="h-6 w-6 animate-spin text-primary" />}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

TooltipTargetMissingDialog.displayName = 'TooltipTargetMissingDialog';
