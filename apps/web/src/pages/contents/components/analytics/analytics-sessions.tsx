import { Card, CardContent, CardHeader, CardTitle, Button, QuestionTooltip } from '@usertour/ui';
import { useMemo } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { useQueryBizSessionsQuery } from '@usertour/hooks';
import { useAnalyticsUI } from '@/contexts/analytics-ui-context';
import { useAppContext } from '@/contexts/app-context';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

import { BizSessionsDataTable } from './data-table';
import { ExportDropdownMenu } from './export-dropmenu';
import { DownloadIcon } from 'lucide-react';

const PAGE_SIZE = 10;

export const AnalyticsSessions = () => {
  const { contentId, dateRange, timezone } = useAnalyticsUI();
  const { environment } = useAppContext();

  // `useCursorPagination` watches this object's identity to know when
  // to reset pagination back to page 1 — any field change (date
  // range, env switch, …) triggers a synchronous reset in the same
  // render, so the next useQuery fires with the new query AND a
  // fresh cursor in one round trip. `useMemo` keeps the reference
  // stable across renders that don't actually change the shape.
  const query = useMemo(
    () => ({
      environmentId: environment?.id ?? '',
      contentId,
      startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : undefined,
      endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : undefined,
      timezone,
    }),
    [environment?.id, contentId, dateRange?.from, dateRange?.to, timezone],
  );

  const {
    rows: bizSessions,
    totalCount,
    pageCount,
    pagination,
    setPagination,
    refetch,
    loading,
  } = useCursorPagination({
    query,
    useListQuery: useQueryBizSessionsQuery,
    defaultPageSize: PAGE_SIZE,
    skip: !environment?.id,
    options: SHARED_CACHE_QUERY_OPTIONS,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow flex items-center gap-1">
              Sessions
              <QuestionTooltip>
                Each user's engagement session with this content, showing when it started and its
                current state.
              </QuestionTooltip>
            </div>
            <ExportDropdownMenu totalCount={totalCount}>
              <Button variant="ghost" className="h-8 text-primary hover:text-primary">
                <DownloadIcon className="mr-1 w-4 h-4" />
                Export to CSV
              </Button>
            </ExportDropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BizSessionsDataTable
            bizSessions={bizSessions}
            pagination={pagination}
            setPagination={setPagination}
            pageCount={pageCount}
            totalCount={totalCount}
            refetch={refetch}
            loading={loading}
          />
        </CardContent>
      </Card>
    </>
  );
};

AnalyticsSessions.displayName = 'AnalyticsSessions';
