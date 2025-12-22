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
import { Button } from '@usertour-packages/button';
import { queryTooltipTargetMissingSessions } from '@usertour-packages/gql';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useAppContext } from '@/contexts/app-context';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { endOfDay, startOfDay } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, DoubleArrowLeftIcon } from '@radix-ui/react-icons';
import { SpinnerIcon } from '@usertour-packages/icons';
import { BizEvents, EventAttributes } from '@usertour/types';

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
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<string[]>([]);

  const [fetchSessions, { loading }] = useLazyQuery(queryTooltipTargetMissingSessions, {
    fetchPolicy: 'network-only',
  });

  const failureRate =
    stepData.totalViews > 0
      ? Math.round((stepData.tooltipTargetMissingCount / stepData.totalViews) * 100)
      : 0;

  const loadData = useCallback(
    async (after?: string, currentPageIndex?: number) => {
      if (!environment?.id || !dateRange?.from || !dateRange?.to) return;

      const result = await fetchSessions({
        variables: {
          first: PAGE_SIZE,
          after,
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
        setSessions(data.edges.map((edge: { node: TooltipTargetMissingSession }) => edge.node));
        setTotalCount(data.totalCount);

        // Store the end cursor for next page navigation
        const pageIdx = currentPageIndex ?? pageIndex;
        if (data.pageInfo.endCursor && after !== data.pageInfo.endCursor) {
          setCursors((prev) => {
            const newCursors = [...prev];
            newCursors[pageIdx] = data.pageInfo.endCursor;
            return newCursors;
          });
        }
      }
    },
    [environment?.id, dateRange, contentId, timezone, stepData.cvid, fetchSessions, pageIndex],
  );

  // Only load data when dialog opens
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setCursors([]);
      setSessions([]);
      setTotalCount(0);
      // Call API directly to avoid dependency issues
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
            setTotalCount(data.totalCount);
            if (data.pageInfo.endCursor) {
              setCursors([data.pageInfo.endCursor]);
            }
          }
        });
      }
    }
  }, [open, environment?.id, dateRange, contentId, timezone, stepData.cvid, fetchSessions]);

  const handleNextPage = () => {
    const cursor = cursors[pageIndex];
    if (cursor) {
      const newPageIndex = pageIndex + 1;
      setPageIndex(newPageIndex);
      loadData(cursor, newPageIndex);
    }
  };

  const handlePreviousPage = () => {
    if (pageIndex > 0) {
      const newPageIndex = pageIndex - 1;
      setPageIndex(newPageIndex);
      const cursor = newPageIndex === 0 ? undefined : cursors[newPageIndex - 1];
      loadData(cursor, newPageIndex);
    }
  };

  const handleFirstPage = () => {
    setPageIndex(0);
    loadData(undefined, 0);
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  // Find the tooltip target missing event and extract URL
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
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
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
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2 py-4 border-t">
          <div className="text-sm text-muted-foreground">{totalCount} sessions in total.</div>
          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {pageIndex + 1} of {pageCount || 1}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={handleFirstPage}
                disabled={!canPreviousPage}
              >
                <span className="sr-only">Go to first page</span>
                <DoubleArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handlePreviousPage}
                disabled={!canPreviousPage}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handleNextPage}
                disabled={!canNextPage}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

TooltipTargetMissingDialog.displayName = 'TooltipTargetMissingDialog';
