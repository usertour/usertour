import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { AnalyticsViewsByTask } from '@usertour-ui/types';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';

export const AnalyticsTasks = () => {
  const { analyticsData, loading } = useAnalyticsContext();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  const computeRate = (task: AnalyticsViewsByTask) => {
    if (!task.analytics.uniqueViews) {
      return 0;
    }
    return Math.round((task.analytics.uniqueCompletions / task.analytics.uniqueViews) * 100);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow">Task breakdown</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead className="w-32">Unique views</TableHead>
                <TableHead className="w-32">Completion rate</TableHead>
                <TableHead className="w-3/5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData?.viewsByTask ? (
                analyticsData?.viewsByTask.map((task: AnalyticsViewsByTask, index) => {
                  const rate = computeRate(task);
                  return (
                    <TableRow key={index} onClick={() => {}}>
                      <TableCell className="py-[1px]">{task.name}</TableCell>
                      <TableCell className="py-[1px]">{task.analytics.uniqueViews}</TableCell>
                      <TableCell className="py-[1px]">{rate}%</TableCell>
                      <TableCell className="py-[1px] px-0">
                        <div
                          className="bg-success h-10"
                          style={{
                            width: `${rate}%`,
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

AnalyticsTasks.displayName = 'AnalyticsTasks';
