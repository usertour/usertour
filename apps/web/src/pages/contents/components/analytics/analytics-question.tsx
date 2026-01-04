import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { ContentEditorElementType } from '@usertour-packages/shared-editor';
import { useQueryContentQuestionAnalyticsQuery } from '@usertour-packages/shared-hooks';
import { endOfDay, format, startOfDay } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { AnswerCount, ContentQuestionAnalytics } from '@usertour/types';
import { AnalyticsNPS } from './analytics-nps';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { AnalyticsScale } from './analytics-scale';
import { useAppContext } from '@/contexts/app-context';
import { AnalyticsQuestionSkeleton } from './analytics-skeleton';

interface AnalyticsMultipleChoiceProps {
  questionAnalytics: ContentQuestionAnalytics;
  totalViews: number;
}

export const AnalyticsMultipleChoice = (props: AnalyticsMultipleChoiceProps) => {
  const { questionAnalytics, totalViews } = props;

  const totalResponses = questionAnalytics.totalResponse ?? 0;
  const responseRate = totalViews > 0 ? Math.round((totalResponses / totalViews) * 100) : 0;

  // Get all option values for matching
  const optionValues = new Set(
    questionAnalytics.question.data.options?.map((option) => String(option.value)) ?? [],
  );

  // Process options with their corresponding answer data
  const optionsWithAnswers =
    questionAnalytics.question.data.options?.map((option) => {
      const answerData = questionAnalytics.answer?.find(
        (answer: AnswerCount) => String(answer.answer) === String(option.value),
      );
      const count = answerData?.count ?? 0;
      const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
      return {
        answer: option.value,
        count,
        percentage,
      };
    }) ?? [];

  // Find answers that are not in options and merge them into "Other"
  const otherAnswers =
    questionAnalytics.answer?.filter(
      (answer: AnswerCount) => !optionValues.has(String(answer.answer)),
    ) ?? [];
  const otherCount = otherAnswers.reduce((sum, answer) => sum + (answer.count ?? 0), 0);
  const otherPercentage = totalResponses > 0 ? Math.round((otherCount / totalResponses) * 100) : 0;

  // Combine options with answers and add "Other" if there are unmatched answers
  const allAnswers = [
    ...optionsWithAnswers,
    ...(otherCount > 0
      ? [
          {
            answer: 'Other',
            count: otherCount,
            percentage: otherPercentage,
          },
        ]
      : []),
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow	">{questionAnalytics.question.data.name} - Multiple choice</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center justify-center w-full py-2">
            <div className="flex flex-row w-fit gap-16">
              <div>
                {totalResponses} <span className="text-sm text-muted-foreground">responses</span>
              </div>
              <div>
                {responseRate}% <span className="text-sm text-muted-foreground">response rate</span>
              </div>
            </div>
          </div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-72">Answer</TableHead>
                <TableHead className="w-28 text-right">Responses</TableHead>
                <TableHead className="w-6" />
                <TableHead className="w-28 text-right">Share</TableHead>
                <TableHead className="w-6" />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAnswers.length > 0 ? (
                allAnswers.map((item, index) => (
                  <TableRow key={index} onClick={() => {}}>
                    <TableCell className="py-[1px] truncate">{item.answer}</TableCell>
                    <TableCell className="py-[1px] text-right">{item.count}</TableCell>
                    <TableCell className="py-[1px] w-6" />
                    <TableCell className="py-[1px] text-right">{item.percentage}%</TableCell>
                    <TableCell className="py-[1px] w-6" />
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-9 bg-gradient-to-r from-success/50 to-success max-w-full"
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

AnalyticsMultipleChoice.displayName = 'AnalyticsMultipleChoice';

export const AnalyticsQuestion = (props: { contentId: string }) => {
  const { contentId } = props;
  const { dateRange, timezone, analyticsData, loading } = useAnalyticsContext();
  const { content, refetch } = useContentDetailContext();

  const startDate = dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : '';
  const endDate = dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : '';

  const { environment } = useAppContext();
  const {
    questionAnalytics,
    refetch: refetchQuestionAnalytics,
    loading: questionLoading,
  } = useQueryContentQuestionAnalyticsQuery(
    environment?.id ?? '',
    contentId,
    startDate,
    endDate,
    timezone,
  );

  const totalViews = analyticsData?.totalViews ?? 0;

  // Helper function to format dates
  const formatDate = (date: string) => format(new Date(date), 'PP');

  // Process questionAnalytics data to format all dates
  const formattedQuestionAnalytics = questionAnalytics?.map((analytics) => ({
    ...analytics,
    averageByDay: analytics.averageByDay?.map((day) => ({
      ...day,
      day: formatDate(day.day),
      startDate: formatDate(day.startDate),
      endDate: formatDate(day.endDate),
    })),
  }));

  const handleRollingWindowChange = async (success: boolean) => {
    if (success) {
      await refetch();
      await refetchQuestionAnalytics();
    }
  };

  if (loading || questionLoading) {
    return <AnalyticsQuestionSkeleton />;
  }

  if (!content) {
    return null;
  }

  // Render analytics components with formatted data
  return formattedQuestionAnalytics?.map((analytics) => {
    if (analytics.question.type === ContentEditorElementType.MULTIPLE_CHOICE) {
      return (
        <AnalyticsMultipleChoice
          key={analytics.question.data.cvid}
          questionAnalytics={analytics}
          totalViews={totalViews}
        />
      );
    }
    if (analytics.question.type === ContentEditorElementType.NPS) {
      return (
        <AnalyticsNPS
          key={analytics.question.data.cvid}
          questionAnalytics={analytics}
          totalViews={totalViews}
          content={content}
          onRollingWindowChange={handleRollingWindowChange}
        />
      );
    }
    if (
      analytics.question.type === ContentEditorElementType.SCALE ||
      analytics.question.type === ContentEditorElementType.STAR_RATING
    ) {
      return (
        <AnalyticsScale
          key={analytics.question.data.cvid}
          questionAnalytics={analytics}
          totalViews={totalViews}
          content={content}
          onRollingWindowChange={handleRollingWindowChange}
        />
      );
    }
    return null;
  });
};

AnalyticsQuestion.displayName = 'AnalyticsQuestion';
