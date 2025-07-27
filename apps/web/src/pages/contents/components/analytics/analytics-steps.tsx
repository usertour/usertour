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
import { AnalyticsViewsByStep } from '@usertour/types';
import { AnalyticsStepsSkeleton } from './analytics-skeleton';

export const AnalyticsSteps = () => {
  const { analyticsData, loading } = useAnalyticsContext();

  if (loading) {
    return <AnalyticsStepsSkeleton />;
  }

  const computeRate = (step: AnalyticsViewsByStep, firstStep: AnalyticsViewsByStep) => {
    if (!step || !step.analytics || !firstStep.analytics.uniqueViews) {
      return 0;
    }
    return Math.round((step.analytics.uniqueViews / firstStep.analytics.uniqueViews) * 100);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow	">Step funnel</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead className="w-32">Unique views</TableHead>
                <TableHead className="w-24">View rate</TableHead>
                <TableHead className="w-3/5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData?.viewsByStep ? (
                analyticsData?.viewsByStep.map((step: AnalyticsViewsByStep, index) => (
                  <TableRow key={index} onClick={() => {}}>
                    <TableCell className="py-[1px]">{step.name}</TableCell>
                    <TableCell className="py-[1px]">{step.analytics.uniqueViews}</TableCell>
                    <TableCell className="py-[1px]">
                      {computeRate(step, analyticsData.viewsByStep[0])}%
                    </TableCell>
                    <TableCell className="py-[1px] px-0">
                      <div
                        className="bg-success h-10"
                        style={{
                          width: `${computeRate(step, analyticsData.viewsByStep[0])}%`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
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

AnalyticsSteps.displayName = 'AnalyticsSteps';
