import { Card, CardContent, CardHeader, CardTitle, Button, QuestionTooltip } from '@usertour/ui';
import { useEffect, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { useAnalyticsUI } from '@/contexts/analytics-ui-context';
import { useBizSessions } from '@/hooks/use-biz-sessions';

import { BizSessionsDataTable } from './data-table';
import { ExportDropdownMenu } from './export-dropmenu';
import { DownloadIcon } from 'lucide-react';

const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };

export const AnalyticsSessions = () => {
  const { contentId, dateRange, timezone } = useAnalyticsUI();
  // Pagination is page-scoped: the toolbar (ExportDropdownMenu) and the
  // table (BizSessionsDataTable) share the same hook call so they see
  // the same totalCount.
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

  // Reset to page 1 whenever the analytics date range changes.
  // Ported from the old `BizSessionProvider` — without this, after
  // narrowing the range to a smaller window the table can stay on a
  // page index that no longer exists.
  useEffect(() => {
    if (!dateRange) {
      return;
    }
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [dateRange]);

  const { bizSessions, totalCount, pageCount, refetch, loading } = useBizSessions(
    contentId,
    pagination,
    dateRange,
    timezone,
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow flex items-center gap-1">
              Sessions
              <QuestionTooltip>
                Each row is one user's engagement session with this content, showing when it started
                and its current state.
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
