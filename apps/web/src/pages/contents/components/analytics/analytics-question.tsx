import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { ContentEditorElementType } from '@usertour-ui/shared-editor';
import { useQueryContentQuestionAnalyticsQuery } from '@usertour-ui/shared-hooks';
import { format } from 'date-fns';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { AnswerCount, ContentQuestionAnalytics } from '@usertour-ui/types';
import { AnalyticsNPS } from './analytics-nps';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { AnalyticsScale } from './analytics-scale';

interface AnalyticsMultipleChoiceProps {
  questionAnalytics: ContentQuestionAnalytics;
  totalViews: number;
}

export const AnalyticsMultipleChoice = (props: AnalyticsMultipleChoiceProps) => {
  const { questionAnalytics, totalViews } = props;

  const totalResponses = questionAnalytics.totalResponse ?? 0;
  const responseRate = totalViews > 0 ? Math.round((totalResponses / totalViews) * 100) : 0;

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Answer</TableHead>
                <TableHead className="w-32">Responses</TableHead>
                <TableHead className="w-24">Share</TableHead>
                <TableHead className="w-3/5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionAnalytics.answer ? (
                questionAnalytics.answer.map((answer: AnswerCount, index) => {
                  const percentage =
                    totalViews > 0 ? Math.round((answer.count / totalResponses) * 100) : 0;
                  return (
                    <TableRow key={index} onClick={() => {}}>
                      <TableCell className="py-[1px]">{answer.answer}</TableCell>
                      <TableCell className="py-[1px]">{answer.count}</TableCell>
                      <TableCell className="py-[1px]">{percentage}%</TableCell>
                      <TableCell className="py-[1px] px-0">
                        <div
                          className="bg-success h-10"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
  const { dateRange, timezone, analyticsData } = useAnalyticsContext();
  const { content, refetch } = useContentDetailContext();
  const { questionAnalytics, refetch: refetchQuestionAnalytics } =
    useQueryContentQuestionAnalyticsQuery(
      contentId,
      dateRange?.from?.toISOString() ?? '',
      dateRange?.to?.toISOString() ?? '',
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
