import { useContentAnalytics } from '@/hooks/use-content-analytics';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour/ui';
import { AnalyticsViewsByTask } from '@usertour/types';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';
import { calculateRate } from '@/utils/analytics';
import { useTranslation } from 'react-i18next';

export const AnalyticsTasks = () => {
  const { analyticsData, loading } = useContentAnalytics();
  const { t } = useTranslation();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row items-center justify-between">
          <div className="grow">{t('contents.analytics.tasks.title')}</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-72">{t('contents.analytics.tasks.task')}</TableHead>
              <TableHead className="text-right w-32">
                {t('contents.analytics.tasks.uniqueViews')}
              </TableHead>
              <TableHead className="text-right w-32">
                {t('contents.analytics.tasks.completionRate')}
              </TableHead>
              <TableHead className="w-6" />
              <TableHead />
              <TableHead className="text-right w-32">
                {t('contents.analytics.tasks.clickRate')}
              </TableHead>
              <TableHead className="w-6" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyticsData?.viewsByTask && analyticsData.viewsByTask.length > 0 ? (
              analyticsData.viewsByTask.map((task: AnalyticsViewsByTask) => {
                const rate = calculateRate(
                  task.analytics.uniqueCompletions,
                  task.analytics.uniqueViews,
                );
                const clickRate = calculateRate(
                  task.analytics.uniqueClicks ?? 0,
                  task.analytics.uniqueViews,
                );
                return (
                  <TableRow key={task.taskId}>
                    <TableCell className="py-[1px] overflow-hidden">
                      <div className="min-w-0">
                        <span className="truncate block">{task.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-[1px] text-right">
                      {task.analytics.uniqueViews}
                    </TableCell>
                    <TableCell className="py-[1px] text-right">{rate}%</TableCell>
                    <TableCell className="py-[1px] px-0 w-6" />
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-9 bg-gradient-to-r from-success/50 to-success"
                        style={{
                          width: `${rate}%`,
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-[1px] text-right">{clickRate}%</TableCell>
                    <TableCell className="py-[1px] px-0 w-6" />
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-9 bg-gradient-to-r from-chart-1/50 to-chart-1"
                        style={{
                          width: `${clickRate}%`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t('contents.analytics.common.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

AnalyticsTasks.displayName = 'AnalyticsTasks';
