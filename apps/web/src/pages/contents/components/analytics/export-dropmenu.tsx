import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { DownloadIcon } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useBizSessionContext } from '@/contexts/biz-session-context';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useQuery } from '@apollo/client';
import { listSessionsDetail } from '@usertour-ui/gql';
import type { BizSession, BizEvent } from '@usertour-ui/types';
import { BizEvents } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { useEventListContext } from '@/contexts/event-list-context';
import { format } from 'date-fns';

// Utility functions
const formatDate = (date: string | null | undefined) => {
  if (!date) return '';
  try {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return format(parsedDate, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const getLastActivityAt = (session: BizSession) => {
  if (!session.bizEvent || session.bizEvent.length === 0) {
    return session.createdAt;
  }
  return session.bizEvent.reduce((latest, event) => {
    return new Date(event.createdAt) > new Date(latest) ? event.createdAt : latest;
  }, session.createdAt);
};

const getCompletedAt = (session: BizSession, eventList: any[] | undefined) => {
  const { bizEvent } = session;
  if (!bizEvent || bizEvent.length === 0 || !eventList) {
    return '';
  }

  const completeEvent = eventList.find((e) => e.codeName === BizEvents.FLOW_COMPLETED);
  const completeBizEvent = bizEvent.find((e) => e.eventId === completeEvent?.id);

  if (!completeBizEvent) {
    return '';
  }

  return completeBizEvent.createdAt;
};

const getState = (session: BizSession, eventList: any[] | undefined) => {
  const { bizEvent } = session;
  if (!bizEvent || bizEvent.length === 0 || !eventList || eventList.length === 0) {
    return 'In Progress';
  }

  const completeEvent = eventList.find((e) => e.codeName === BizEvents.FLOW_COMPLETED);
  const endedEvent = eventList.find((e) => e.codeName === BizEvents.FLOW_ENDED);

  if (!completeEvent || !endedEvent) {
    return 'In Progress';
  }
  const completeBizEvent = bizEvent.find((e) => e.eventId === completeEvent.id);
  const endedBizEvent = bizEvent.find((e) => e.eventId === endedEvent.id);

  const isComplete = !!completeBizEvent;
  const isDismissed = !!endedBizEvent;

  if (isComplete) {
    return 'Completed';
  }
  if (isDismissed) {
    return 'Dismissed';
  }
  return 'In Progress';
};

const getStepData = (events: BizEvent[]) => {
  const stepData = {
    nps: '',
    feedback: '',
    done: false,
  };

  for (const event of events) {
    switch (event.event?.codeName) {
      case 'nps':
        stepData.nps = event.data?.score || '';
        break;
      case 'feedback':
        stepData.feedback = event.data?.text || '';
        break;
      case 'done':
        stepData.done = true;
        break;
    }
  }

  return stepData;
};

type ExportDropdownMenuProps = {
  children: ReactNode;
};

export const ExportDropdownMenu = (props: ExportDropdownMenuProps) => {
  const { children } = props;
  const { dateRange, contentId, timezone } = useAnalyticsContext();
  const { totalCount } = useBizSessionContext();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { eventList } = useEventListContext();

  const query = {
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

  const handleExportCSV = async () => {
    if (isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      toast({
        title: 'Starting export...',
        description: 'Please wait while we prepare your data.',
      });

      // Calculate how many pages we need to fetch
      const pageSize = 100;
      const totalPages = Math.ceil(totalCount / pageSize);
      let allSessions: BizSession[] = [];
      let currentCursor: string | null = null;

      // Fetch all pages
      for (let i = 0; i < totalPages; i++) {
        const result = await refetch({
          first: pageSize,
          after: currentCursor,
          query,
          orderBy,
        });

        const sessions = result.data?.listSessionsDetail?.edges?.map((e: any) => e.node) || [];
        allSessions = [...allSessions, ...sessions];

        // Get the cursor for the next page
        const lastEdge = result.data?.listSessionsDetail?.edges?.slice(-1)[0];
        currentCursor = lastEdge?.cursor;

        // If no cursor or no more edges, break
        if (!currentCursor || !result.data?.listSessionsDetail?.edges?.length) {
          break;
        }
      }

      // Convert to CSV format
      const headers = [
        'User: ID',
        'User: Name',
        'User: Email',
        'Company: ID',
        'Company: Name',
        'Version',
        'Started at (UTC)',
        'Last activity at (UTC)',
        'Completed at (UTC)',
        'Progress',
        'State',
        'Start reason',
        'End reason',
        'Step 1: NPS',
        'Step 2: Feedback',
        'Step 3: Done',
      ];

      const rows = allSessions.map((session) => {
        const stepData = getStepData(session.bizEvent || []);
        return [
          session.bizUser?.externalId || '',
          session.bizUser?.data?.name || '',
          session.bizUser?.data?.email || '',
          session.bizUser?.bizUsersOnCompany?.[0]?.bizCompany?.externalId || '',
          session.bizUser?.bizUsersOnCompany?.[0]?.bizCompany?.data?.name || '',
          `v${session.version?.sequence}`,
          formatDate(session.createdAt),
          formatDate(getLastActivityAt(session)),
          formatDate(getCompletedAt(session, eventList)),
          `${session.progress}%`,
          getState(session, eventList),
          session.data?.startReason || 'Matched auto-start condition',
          session.data?.endReason || 'Ended through action',
          stepData.nps,
          stepData.feedback,
          stepData.done ? 'Yes' : 'No',
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      // Create a Blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `sessions_${dateRange?.from?.toISOString().split('T')[0]}_${
          dateRange?.to?.toISOString().split('T')[0]
        }.csv`,
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
          onClick={handleExportCSV}
          disabled={isExporting}
        >
          <DownloadIcon className="mr-1 w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

ExportDropdownMenu.displayName = 'ExportDropdownMenu';
