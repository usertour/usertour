import { useAnalyticsUI } from '@/contexts/analytics-ui-context';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import {
  DefaultAvatar,
  ListSkeleton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  QuestionTooltip,
  useToast,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour/ui';
import { useApolloClient } from '@apollo/client';
import { queryTrackerUsers } from '@usertour/gql';
import { useQueryTrackerUsersQuery } from '@usertour/hooks';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { DownloadIcon } from 'lucide-react';
import { endOfDay, startOfDay, formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface TrackerUserNode {
  id: string;
  firstTrackedAt: string;
  lastTrackedAt: string;
  eventsCount: number;
  bizUser: {
    id: string;
    externalId: string;
    data: Record<string, any>;
  };
  bizCompany?: {
    id: string;
    externalId: string;
    data: Record<string, any>;
  } | null;
}

const PAGE_SIZES = [10, 20, 30, 40, 50];

const formatUTCDate = (date: string | null | undefined) => {
  if (!date) return '';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = parsedDate.getUTCFullYear();
  const month = pad(parsedDate.getUTCMonth() + 1);
  const day = pad(parsedDate.getUTCDate());
  const hours = pad(parsedDate.getUTCHours());
  const minutes = pad(parsedDate.getUTCMinutes());
  const seconds = pad(parsedDate.getUTCSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const toCSVCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  const normalizedValue = String(value).replace(/\r?\n/g, ' ');
  if (/[",]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
};

const formatLocalDateForFilename = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const sanitizeFileName = (value?: string) =>
  Array.from((value || 'tracker').trim())
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 40)
    .replace(/-+$/g, '');

export const AnalyticsTrackerUsers = ({ contentId }: { contentId: string }) => {
  const { dateRange, timezone } = useAnalyticsUI();
  const { environment } = useAppContext();
  const { content } = useContentDetail(contentId);
  const client = useApolloClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const afterCursor = pageIndex > 0 ? cursors[pageIndex - 1] : undefined;

  const { edges, pageInfo, totalCount, loading } = useQueryTrackerUsersQuery({
    first: pageSize,
    after: afterCursor,
    query: {
      environmentId: environment?.id ?? '',
      contentId,
      startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : '',
      endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : '',
      timezone,
    },
    options: { skip: !dateRange?.from || !dateRange?.to || !environment?.id },
  });
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const users = edges.map((e: { node: TrackerUserNode }) => e.node);

  const exportQuery = {
    environmentId: environment?.id ?? '',
    contentId,
    startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : '',
    endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : '',
    timezone,
  };

  const handleExportCSV = useCallback(async () => {
    if (
      isExporting ||
      !environment?.id ||
      !dateRange?.from ||
      !dateRange?.to ||
      !exportQuery.startDate ||
      !exportQuery.endDate
    ) {
      return;
    }

    try {
      setIsExporting(true);
      toast({
        title: t('contents.analytics.export.startingTitle'),
        description: t('contents.analytics.export.startingTrackerDescription'),
      });

      const allUsers: TrackerUserNode[] = [];
      let after: string | null = null;
      const chunkSize = 200;

      while (true) {
        const result: any = await client.query({
          query: queryTrackerUsers,
          variables: {
            first: chunkSize,
            after,
            query: exportQuery,
            orderBy: { field: 'createdAt', direction: 'desc' },
          },
          fetchPolicy: 'network-only',
        });

        const connection: any = result.data?.queryTrackerUsers;
        const fetchedEdges = connection?.edges ?? [];
        const fetchedUsers = fetchedEdges.map(
          (edge: { node: TrackerUserNode }) => edge.node,
        ) as TrackerUserNode[];
        allUsers.push(...fetchedUsers);

        const nextPage = connection?.pageInfo?.hasNextPage;
        const endCursor = connection?.pageInfo?.endCursor;
        if (!nextPage || !endCursor || fetchedEdges.length === 0) {
          break;
        }
        after = endCursor;
      }

      const headers = [
        t('contents.analytics.trackerUsers.csv.userId'),
        t('contents.analytics.trackerUsers.csv.userName'),
        t('contents.analytics.trackerUsers.csv.userEmail'),
        t('contents.analytics.trackerUsers.csv.companyId'),
        t('contents.analytics.trackerUsers.csv.companyName'),
        t('contents.analytics.trackerUsers.csv.firstTrackedUtc'),
        t('contents.analytics.trackerUsers.csv.lastTrackedUtc'),
        t('contents.analytics.trackerUsers.csv.events'),
      ];

      const rows = allUsers.map((user) => [
        user.bizUser?.externalId || '',
        (user.bizUser?.data?.name as string) || '',
        (user.bizUser?.data?.email as string) || '',
        user.bizCompany?.externalId || '',
        (user.bizCompany?.data?.name as string) || '',
        formatUTCDate(user.firstTrackedAt),
        formatUTCDate(user.lastTrackedAt),
        user.eventsCount ?? 0,
      ]);

      const csvContent = [
        headers.map(toCSVCell).join(','),
        ...rows.map((r) => r.map(toCSVCell).join(',')),
      ].join('\n');
      const fromLabel = dateRange?.from
        ? formatLocalDateForFilename(new Date(dateRange.from))
        : 'all';
      const toLabel = dateRange?.to ? formatLocalDateForFilename(new Date(dateRange.to)) : 'all';
      const filename = `Usertour-${sanitizeFileName(content?.name || 'tracker')}-events-${fromLabel}_to_${toLabel}.csv`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t('contents.analytics.export.completedTitle'),
        description: t('contents.analytics.export.completedUsersDescription', {
          count: allUsers.length,
        }),
      });
    } catch (error) {
      console.error('Tracker CSV export failed:', error);
      toast({
        title: t('contents.analytics.export.failedTitle'),
        description: t('contents.analytics.export.failedTrackerDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    client,
    content?.name,
    dateRange?.from,
    dateRange?.to,
    environment?.id,
    exportQuery,
    isExporting,
    toast,
    t,
  ]);

  // Reset to first page when date range or page size changes
  useEffect(() => {
    setPageIndex(0);
    setCursors([]);
  }, [dateRange, pageSize]);

  // Update cursors when data arrives
  useEffect(() => {
    if (pageInfo?.endCursor && edges.length > 0) {
      setCursors((prev) => {
        const next = [...prev];
        next[pageIndex] = pageInfo.endCursor!;
        return next;
      });
    }
  }, [pageInfo?.endCursor, pageIndex, edges.length]);

  const goPrev = useCallback(() => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    }
  }, [pageIndex]);

  const goNext = useCallback(() => {
    if (pageInfo?.hasNextPage) {
      setPageIndex((p) => p + 1);
    }
  }, [pageInfo?.hasNextPage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <div className="grow flex items-center gap-1">
            {t('contents.analytics.trackerUsers.title')}
            <QuestionTooltip>{t('contents.analytics.trackerUsers.tooltip')}</QuestionTooltip>
          </div>
          <Button
            variant="ghost"
            className="h-8 text-primary hover:text-primary"
            onClick={handleExportCSV}
            disabled={isExporting || !environment?.id || !dateRange?.from || !dateRange?.to}
          >
            <DownloadIcon className="mr-1 w-4 h-4" />
            {isExporting
              ? t('contents.analytics.export.exporting')
              : t('contents.analytics.trackerUsers.exportToCsv')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ListSkeleton length={pageSize} />
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t('contents.analytics.trackerUsers.empty')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-2/5">
                      {t('contents.analytics.trackerUsers.user')}
                    </TableHead>
                    <TableHead>{t('contents.analytics.trackerUsers.firstTracked')}</TableHead>
                    <TableHead>{t('contents.analytics.trackerUsers.lastTracked')}</TableHead>
                    <TableHead className="text-right">
                      {t('contents.analytics.trackerUsers.events')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const bizUser = user.bizUser;
                    const bizCompany = user.bizCompany;
                    const email = (bizUser?.data?.email as string) || '';
                    const name = (bizUser?.data?.name as string) || '';
                    const externalId = bizUser?.externalId || '';
                    const primaryText = name || email || externalId;
                    const showSecondLine = email && primaryText !== email ? email : null;
                    const companyName =
                      (bizCompany?.data?.name as string) || bizCompany?.externalId || '';

                    return (
                      <TableRow key={user.id} className="h-10">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DefaultAvatar seed={externalId || email} name={name} size="sm" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Link
                                  to={`/env/${environment?.id}/user/${user.id}`}
                                  className="font-medium hover:text-primary hover:underline underline-offset-4"
                                >
                                  {primaryText}
                                </Link>
                                {companyName && bizCompany?.id && (
                                  <span className="text-muted-foreground text-xs">
                                    {t('contents.analytics.trackerUsers.from')}{' '}
                                    <Link
                                      to={`/env/${environment?.id}/company/${bizCompany.id}`}
                                      className="hover:text-primary hover:underline underline-offset-4"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {companyName}
                                    </Link>
                                  </span>
                                )}
                              </div>
                              {showSecondLine && (
                                <span className="text-muted-foreground text-xs">
                                  {showSecondLine}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(user.firstTrackedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(user.lastTrackedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">{user.eventsCount}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
              <div className="flex-1 text-sm text-muted-foreground">
                {t('contents.analytics.trackerUsers.totalCount', { count: totalCount })}
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t('contents.analytics.trackerUsers.rowsPerPage')}
                  </p>
                  <Select
                    value={`${pageSize}`}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={`${size}`}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  {t('contents.analytics.trackerUsers.pageOf', {
                    current: pageIndex + 1,
                    total: pageCount,
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={goPrev}
                    disabled={pageIndex === 0}
                  >
                    <span className="sr-only">
                      {t('contents.analytics.trackerUsers.goToPreviousPage')}
                    </span>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={goNext}
                    disabled={!pageInfo?.hasNextPage}
                  >
                    <span className="sr-only">
                      {t('contents.analytics.trackerUsers.goToNextPage')}
                    </span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

AnalyticsTrackerUsers.displayName = 'AnalyticsTrackerUsers';
