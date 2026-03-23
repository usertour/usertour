import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { User, UserCog } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useBizSessionContext } from '@/contexts/biz-session-context';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useQuery } from '@apollo/client';
import { getContentVersion, listSessionsDetail } from '@usertour-packages/gql';
import type { BizSession, ContentVersion } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useAppContext } from '@/contexts/app-context';
import { buildExportPayload } from './export-csv.utils';

type ExportDropdownMenuProps = {
  children: ReactNode;
};

export const ExportDropdownMenu = (props: ExportDropdownMenuProps) => {
  const { children } = props;
  const { dateRange, contentId, timezone } = useAnalyticsContext();
  const { totalCount } = useBizSessionContext();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { content } = useContentDetailContext();
  const { attributeList } = useAttributeListContext();
  const { environment } = useAppContext();
  const versionId = content?.publishedVersionId || content?.editedVersionId;
  const { data } = useQuery(getContentVersion, {
    variables: { versionId },
    skip: !versionId,
  });
  const version = data?.getContentVersion as ContentVersion;

  const query = {
    environmentId: environment?.id ?? '',
    contentId,
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
    timezone,
  };
  const orderBy = { field: 'createdAt', direction: 'desc' };
  const { refetch } = useQuery(listSessionsDetail, {
    variables: {
      first: 100,
      query,
      orderBy,
    },
    skip: true,
  });

  const handleExportCSV = async (includeAllAttributes = false) => {
    if (isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      toast({
        title: 'Starting export...',
        description: 'Please wait while we prepare your data.',
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
        version,
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
        title: 'Export completed',
        description: `Successfully exported ${allSessions.length} sessions.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting the data. Please try again.',
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
          className={`cursor-pointer ${isExporting ? 'opacity-50' : ''}`}
          onClick={() => handleExportCSV(false)}
          disabled={isExporting}
        >
          <User className="mr-1 w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Standard user attributes'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`cursor-pointer ${isExporting ? 'opacity-50' : ''}`}
          onClick={() => handleExportCSV(true)}
          disabled={isExporting}
        >
          <UserCog className="mr-1 w-4 h-4" />
          {isExporting ? 'Exporting...' : 'All user attributes'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

ExportDropdownMenu.displayName = 'ExportDropdownMenu';
