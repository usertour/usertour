import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { User, UserCog } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useBizSessionContext } from '@/contexts/biz-session-context';
import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useQuery } from '@apollo/client';
import { getContentVersion, listSessionsDetail } from '@usertour-ui/gql';
import type {
  BizSession,
  BizEvent,
  ContentVersion,
  flowStartReason,
  flowEndReason,
} from '@usertour-ui/types';
import {
  AttributeBizTypes,
  BizEvents,
  EventAttributes,
  flowReasonTitleMap,
} from '@usertour-ui/types';
import {
  ContentEditorElementType,
  extractQuestionData,
  contentTypesConfig,
} from '@usertour-ui/shared-editor';
import { useToast } from '@usertour-ui/use-toast';
import { useEventListContext } from '@/contexts/event-list-context';
import { format } from 'date-fns';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
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

const getQuestionAnswer = (answerEvent: BizEvent) => {
  switch (answerEvent.data.question_type) {
    case ContentEditorElementType.STAR_RATING:
    case ContentEditorElementType.SCALE:
    case ContentEditorElementType.NPS:
      return answerEvent.data.number_answer;
    case ContentEditorElementType.MULTIPLE_CHOICE:
      return Array.isArray(answerEvent.data.list_answer)
        ? answerEvent.data.list_answer.join('; ')
        : answerEvent.data.list_answer;
    case ContentEditorElementType.MULTI_LINE_TEXT:
      return (answerEvent.data.text_answer || '').replace(/\n/g, ' ');
    default:
      return (answerEvent.data.text_answer || '').replace(/\n/g, ' ');
  }
};

const getFlowReasons = (events: BizEvent[]) => {
  const startEvent = events.find((event) => event.event?.codeName === BizEvents.FLOW_STARTED);
  const endEvent = events.find((event) => event.event?.codeName === BizEvents.FLOW_ENDED);

  return {
    startReason:
      flowReasonTitleMap[
        startEvent?.data?.[EventAttributes.FLOW_START_REASON] as flowStartReason
      ] || '',
    endReason:
      flowReasonTitleMap[endEvent?.data?.[EventAttributes.FLOW_END_REASON] as flowEndReason] || '',
  };
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
  const { content } = useContentDetailContext();
  const { attributeList } = useAttributeListContext();
  const { data } = useQuery(getContentVersion, {
    variables: { versionId: content?.publishedVersionId || content?.editedVersionId },
  });
  const version = data?.getContentVersion as ContentVersion;

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

      // Get all unique question names from version steps
      const questionHeaders = new Map<string, string>(); // cvid -> name
      const stepHeaders = new Map<string, string>(); // step number -> name
      if (version?.steps) {
        for (const step of version.steps) {
          // Collect questions
          const questions = extractQuestionData(step.data);
          for (const question of questions) {
            if (question.data?.name && question.data?.cvid) {
              const questionType =
                contentTypesConfig.find((config) => config.element.type === question.type)?.name ||
                question.type;
              questionHeaders.set(
                question.data.cvid,
                `Question (${questionType}): ${question.data.name}`,
              );
            }
          }

          // Collect steps
          if (step.name) {
            stepHeaders.set(step.sequence.toString(), `Step ${step.sequence + 1}. ${step.name}`);
          }
        }
      }

      // Convert to CSV format
      const baseHeaders = ['User: ID', 'User: Name', 'User: Email'];

      // Add user attributes if includeAllAttributes is true
      const userAttributeHeaders = includeAllAttributes
        ? attributeList
            ?.filter(
              (attr) =>
                attr.bizType === AttributeBizTypes.User &&
                attr.codeName !== 'name' &&
                attr.codeName !== 'email',
            ) // User attributes excluding name and email
            .map((attr) => `User: ${attr.displayName}`) || []
        : [];

      // Find max number of companies across all sessions
      const maxCompanies = Math.max(
        ...allSessions.map((session) => session.bizUser?.bizUsersOnCompany?.length || 0),
        1, // Ensure at least 1 company column is generated
      );

      // Generate company headers based on max companies
      const companyHeaders =
        maxCompanies <= 1
          ? ['Company: ID', 'Company: Name']
          : Array.from({ length: maxCompanies }, (_, i) => [
              `Company(${i + 1}): ID`,
              `Company(${i + 1}): Name`,
            ]).flat();

      const otherHeaders = [
        'Version',
        'Started at (UTC)',
        'Last activity at (UTC)',
        'Completed at (UTC)',
        'Progress',
        'State',
        'Start reason',
        'End reason',
      ];

      const headers = [
        ...baseHeaders,
        ...userAttributeHeaders,
        ...companyHeaders,
        ...otherHeaders,
        ...Array.from(questionHeaders.values()),
        ...Array.from(stepHeaders.values()),
      ];

      const rows = allSessions.map((session) => {
        const events = session.bizEvent || [];

        // Create a map of question answers for this session
        const questionAnswers = new Map<string, string>(); // cvid -> answer
        const stepViews = new Map<string, number>(); // step number -> view count

        // Get flow reasons
        const { startReason, endReason } = getFlowReasons(events);

        // Process events
        for (const event of events) {
          // Handle question answers
          if (event.data?.[EventAttributes.QUESTION_CVID]) {
            questionAnswers.set(
              event.data[EventAttributes.QUESTION_CVID],
              getQuestionAnswer(event),
            );
          }
        }

        // Count step views
        for (const stepNumber of stepHeaders.keys()) {
          const viewCount = events.filter(
            (event) =>
              event.event?.codeName === BizEvents.FLOW_STEP_SEEN &&
              event.data?.[EventAttributes.FLOW_STEP_NUMBER] === Number.parseInt(stepNumber),
          ).length;
          stepViews.set(stepNumber, viewCount);
        }

        // Get user base info
        const baseRow = [
          session.bizUser?.externalId || '',
          session.bizUser?.data?.name || '',
          session.bizUser?.data?.email || '',
        ];

        // Add user attributes if includeAllAttributes is true
        const userAttributeValues = includeAllAttributes
          ? attributeList
              ?.filter(
                (attr) =>
                  attr.bizType === AttributeBizTypes.User &&
                  attr.codeName !== 'name' &&
                  attr.codeName !== 'email',
              ) // User attributes excluding name and email
              .map((attr) => {
                const value = session.bizUser?.data?.[attr.codeName];
                return typeof value === 'string' ? value : JSON.stringify(value || '');
              }) || []
          : [];

        // Get company info
        const companies = session.bizUser?.bizUsersOnCompany || [];
        const companyValues = Array.from({ length: maxCompanies }, (_, i) => {
          const company = companies[i];
          return [company?.bizCompany?.externalId || '', company?.bizCompany?.data?.name || ''];
        }).flat();

        // Get common info
        const commonInfo = [
          `v${session.version?.sequence}`,
          formatDate(session.createdAt),
          formatDate(getLastActivityAt(session)),
          formatDate(getCompletedAt(session, eventList)),
          `${session.progress}%`,
          getState(session, eventList),
          startReason,
          endReason,
        ];

        // Add question answers in the same order as headers
        const questionAnswersRow = Array.from(questionHeaders.keys()).map(
          (cvid) => questionAnswers.get(cvid) || '',
        );

        // Add step view counts in the same order as headers
        const stepViewsRow = Array.from(stepHeaders.keys()).map(
          (stepNumber) => stepViews.get(stepNumber) || 0,
        );

        return [
          ...baseRow,
          ...userAttributeValues,
          ...companyValues,
          ...commonInfo,
          ...questionAnswersRow,
          ...stepViewsRow,
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
