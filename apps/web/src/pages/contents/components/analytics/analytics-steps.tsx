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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { AnalyticsViewsByStep } from '@usertour/types';
import { useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';

import { GoalStepBadge } from '@/components/molecules/goal-step-badge';

import { AnalyticsStepsSkeleton } from './analytics-skeleton';
import { TooltipTargetMissingDialog } from './components/tooltip-target-missing-dialog';

export const AnalyticsSteps = () => {
  const { analyticsData, loading } = useAnalyticsContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<AnalyticsViewsByStep | null>(null);

  if (loading) {
    return <AnalyticsStepsSkeleton />;
  }

  const computeRate = (step: AnalyticsViewsByStep, firstStep: AnalyticsViewsByStep) => {
    if (!step || !step.analytics || !firstStep.analytics.uniqueViews) {
      return 0;
    }
    return Math.round((step.analytics.uniqueViews / firstStep.analytics.uniqueViews) * 100);
  };

  const hasExplicitGoalStep = analyticsData?.viewsByStep?.some(
    (step) => step.explicitCompletionStep,
  );

  const isGoalStep = (step: AnalyticsViewsByStep, index: number) => {
    if (hasExplicitGoalStep) {
      return step.explicitCompletionStep;
    }
    // If no explicit goal step, the last step is the goal step
    return index === (analyticsData?.viewsByStep?.length ?? 0) - 1;
  };

  const handleOpenDialog = (step: AnalyticsViewsByStep) => {
    setSelectedStep(step);
    setDialogOpen(true);
  };

  const computeFailureRate = (step: AnalyticsViewsByStep) => {
    const totalViews = step.analytics.totalViews || 0;
    const tooltipTargetMissingCount = step.analytics.tooltipTargetMissingCount ?? 0;
    if (totalViews === 0) return 0;
    return Math.round((tooltipTargetMissingCount / totalViews) * 100);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row items-center">
            <div className="grow">Step funnel</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Step</TableHead>
                <TableHead className="w-28">Unique views</TableHead>
                <TableHead className="w-24">View rate</TableHead>
                <TableHead />
                <TableHead className="w-28 text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center cursor-help">
                          <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tooltip target not found</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData?.viewsByStep ? (
                analyticsData?.viewsByStep.map((step: AnalyticsViewsByStep, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-[1px]">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="truncate" title={step.name}>
                          {step.name}
                        </span>
                        {isGoalStep(step, index) && <GoalStepBadge />}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-[1px] text-center">
                      {computeFailureRate(step) === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="text-destructive cursor-pointer hover:underline underline-offset-4"
                                onClick={() => handleOpenDialog(step)}
                              >
                                {computeFailureRate(step)}%
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click to view tooltip targets not found</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedStep && (
        <TooltipTargetMissingDialog
          stepData={selectedStep}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
};

AnalyticsSteps.displayName = 'AnalyticsSteps';
