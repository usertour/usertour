import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@usertour/ui';
import { User, UserCog } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useAnalyticsUI } from '@/contexts/analytics-ui-context';
import { useGetContentVersionQuery, useListSessionsDetailQuery } from '@usertour/hooks';
import type { BizSession } from '@usertour/types';
import { endOfDay, startOfDay } from 'date-fns';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useAppContext } from '@/contexts/app-context';
import { buildExportPayload } from './export-csv.utils';
import { useTranslation } from 'react-i18next';

type ExportDropdownMenuProps = {
  children: ReactNode;
  totalCount: number;
};

export const ExportDropdownMenu = (props: ExportDropdownMenuProps) => {
  const { children, totalCount } = props;
  const { dateRange, contentId, timezone } = useAnalyticsUI();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { content } = useContentDetail(contentId);
  const { attributeList } = useAttributeList();
  const { environment } = useAppContext();
  const versionId = content?.publishedVersionId || content?.editedVersionId;
  const { version } = useGetContentVersionQuery(versionId);

  // Match the on-screen table's day boundaries (`use-biz-sessions.ts` /
  // `analytics-question.tsx` / `analytics-tracker-users.tsx` all use
  // `startOfDay` / `endOfDay`). Raw `toISOString()` would pin the
  // window to the exact moment the date picker was opened, narrowing
  // the export against the visible totalCount and missing sessions
  // near the boundary days.
  const query = {
    environmentId: environment?.id ?? '',
    contentId,
    startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : undefined,
    endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : undefined,
    timezone,
  };
  const orderBy = { field: 'createdAt', direction: 'desc' as const };
  // `skip: true` — the export handler calls `refetch` imperatively in a
  // cursor loop instead of letting Apollo auto-fetch.
  const { refetch } = useListSessionsDetailQuery({
    query,
    orderBy,
    options: { skip: true },
  });

  const handleExportCSV = async (includeAllAttributes = false) => {
    if (isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      toast({
        title: t('contents.analytics.export.startingTitle'),
        description: t('contents.analytics.export.startingDescription'),
      });

      const pageSize = 100;
      const totalPages = Math.ceil(totalCount / pageSize);
      let allSessions: BizSession[] = [];
      let currentCursor: string | null = null;

      for (let i = 0; i < totalPages; i++) {
        const result = await refetch({
          first: pageSize,
          after: currentCursor,
          query,
          orderBy,
        });

        const sessions =
          result.data?.listSessionsDetail?.edges?.map((edge: { node: BizSession }) => edge.node) ||
          [];
        allSessions = [...allSessions, ...sessions];

        const lastEdge = result.data?.listSessionsDetail?.edges?.slice(-1)[0];
        currentCursor = lastEdge?.cursor;

        if (!currentCursor || !result.data?.listSessionsDetail?.edges?.length) {
          break;
        }
      }

      const payload = buildExportPayload({
        sessions: allSessions,
        contentType: content?.type,
        contentName: content?.name,
        includeAllAttributes,
        attributeList,
        version: version ?? undefined,
        dateRange,
      });

      const blob = new Blob([payload.csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', payload.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t('contents.analytics.export.completedTitle'),
        description: t('contents.analytics.export.completedSessionsDescription', {
          count: allSessions.length,
        }),
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: t('contents.analytics.export.failedTitle'),
        description: t('contents.analytics.export.failedSessionsDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isExporting}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[101]">
        <DropdownMenuItem
          className={isExporting ? 'opacity-50' : ''}
          onClick={() => handleExportCSV(false)}
          disabled={isExporting}
        >
          <User className="mr-1 w-4 h-4" />
          {isExporting
            ? t('contents.analytics.export.exporting')
            : t('contents.analytics.export.standardUserAttributes')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={isExporting ? 'opacity-50' : ''}
          onClick={() => handleExportCSV(true)}
          disabled={isExporting}
        >
          <UserCog className="mr-1 w-4 h-4" />
          {isExporting
            ? t('contents.analytics.export.exporting')
            : t('contents.analytics.export.allUserAttributes')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

ExportDropdownMenu.displayName = 'ExportDropdownMenu';
