import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { AnalyticsViewsByTask } from '@usertour/types';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';
import { calculateRate } from '@/utils/analytics';

export const AnalyticsTasks = () => {
  const { analyticsData, loading } = useAnalyticsContext();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row items-center justify-between">
          <div className="grow">Task breakdown</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-72">Task</TableHead>
              <TableHead className="text-right w-32">Unique views</TableHead>
              <TableHead className="text-right w-32">Completion rate</TableHead>
              <TableHead className="w-8" />
              <TableHead />
              <TableHead className="text-right w-32">Click rate</TableHead>
              <TableHead className="w-8" />
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
                    <TableCell className="py-[1px] px-0 w-8" />
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-10 bg-gradient-to-r from-success/50 to-success"
                        style={{
                          width: `${rate}%`,
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-[1px] text-right">{clickRate}%</TableCell>
                    <TableCell className="py-[1px] px-0 w-8" />
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="h-10 bg-gradient-to-r from-chart-1/50 to-chart-1"
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
                  No results.
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
