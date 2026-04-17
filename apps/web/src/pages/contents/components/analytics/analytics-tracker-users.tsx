import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { useApolloClient, useQuery } from '@apollo/client';
import { queryTrackerUsers } from '@usertour-packages/gql';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Button } from '@usertour-packages/button';
import { useToast } from '@usertour-packages/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { DownloadIcon } from 'lucide-react';
import { endOfDay, startOfDay, formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

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

interface PageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  const { dateRange, timezone } = useAnalyticsContext();
  const { environment } = useAppContext();
  const { content } = useContentDetailContext();
  const client = useApolloClient();
  const { toast } = useToast();

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const afterCursor = pageIndex > 0 ? cursors[pageIndex - 1] : undefined;

  const { data, loading } = useQuery(queryTrackerUsers, {
    variables: {
      first: pageSize,
      after: afterCursor,
      query: {
        environmentId: environment?.id ?? '',
        contentId,
        startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : '',
        endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : '',
        timezone,
      },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
    skip: !dateRange?.from || !dateRange?.to || !environment?.id,
  });

  const result = data?.queryTrackerUsers;
  const edges: { cursor: string; node: TrackerUserNode }[] = result?.edges ?? [];
  const pageInfo: PageInfo | undefined = result?.pageInfo;
  const totalCount: number = result?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const users = edges.map((e) => e.node);

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
        title: 'Starting export...',
        description: 'Preparing tracker user data for CSV.',
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
        'User: ID',
        'User: Name',
        'User: Email',
        'Company: ID',
        'Company: Name',
        'First tracked (UTC)',
        'Last tracked at (UTC)',
        'Events',
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
        title: 'Export completed',
        description: `Successfully exported ${allUsers.length} users.`,
      });
    } catch (error) {
      console.error('Tracker CSV export failed:', error);
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting tracker users.',
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
          <div className="grow">Users who tracked this event</div>
          <Button
            variant="ghost"
            className="h-8 text-primary hover:text-primary"
            onClick={handleExportCSV}
            disabled={isExporting || !environment?.id || !dateRange?.from || !dateRange?.to}
          >
            <DownloadIcon className="mr-1 w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ListSkeleton length={pageSize} />
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Tracker event data will appear here once the tracker is published and events are being
            tracked.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-2/5">User</TableHead>
                    <TableHead>First tracked</TableHead>
                    <TableHead>Last tracked</TableHead>
                    <TableHead className="text-right">Events</TableHead>
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
                            <UserAvatar email={email} name={name} size="sm" />
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
                                    from{' '}
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
                {totalCount} user{totalCount !== 1 ? 's' : ''} in total.
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows per page</p>
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
                  Page {pageIndex + 1} of {pageCount}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={goPrev}
                    disabled={pageIndex === 0}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={goNext}
                    disabled={!pageInfo?.hasNextPage}
                  >
                    <span className="sr-only">Go to next page</span>
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
