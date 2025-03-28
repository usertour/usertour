import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { ContentEditorElementType } from '@usertour-ui/shared-editor';
import { useQueryContentQuestionAnalyticsQuery } from '@usertour-ui/shared-hooks';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { AnswerCount, ContentQuestionAnalytics } from '@usertour-ui/types';

interface AnalyticsMultipleChoiceProps {
  questionAnalytics: ContentQuestionAnalytics;
  totalViews: number;
}

export const AnalyticsMultipleChoice = (props: AnalyticsMultipleChoiceProps) => {
  const { questionAnalytics, totalViews } = props;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow	">{questionAnalytics.question.data.name} - Multiple choice</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    totalViews > 0 ? Math.round((answer.count / totalViews) * 100) : 0;
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
  const { questionAnalytics } = useQueryContentQuestionAnalyticsQuery(
    contentId,
    dateRange?.from?.toISOString() ?? '',
    dateRange?.to?.toISOString() ?? '',
    timezone,
  );

  return questionAnalytics?.map((analytics) =>
    analytics.question.type === ContentEditorElementType.MULTIPLE_CHOICE ? (
      <AnalyticsMultipleChoice
        key={analytics.question.data.cvid}
        questionAnalytics={analytics}
        totalViews={analyticsData?.totalViews ?? 0}
      />
    ) : null,
  );
};

AnalyticsQuestion.displayName = 'AnalyticsQuestion';
