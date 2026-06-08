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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { AnalyticsViewsByStep, StepContentType } from '@usertour/types';
import { useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GoalStepBadge } from '@/components/goal-step-badge';
import { calculateRate, calculateUniqueFailureRate } from '@/utils/analytics';

import { AnalyticsStepsSkeleton } from './analytics-skeleton';
import { TooltipTargetMissingDialog } from './components/tooltip-target-missing-dialog';

export const AnalyticsSteps = () => {
  const { analyticsData, loading } = useContentAnalytics();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<AnalyticsViewsByStep | null>(null);

  if (loading) {
    return <AnalyticsStepsSkeleton />;
  }

  const viewsByStep = Array.isArray(analyticsData?.viewsByStep) ? analyticsData.viewsByStep : [];
  const hasExplicitGoalStep = viewsByStep.some((step) => step.explicitCompletionStep);

  const isGoalStep = (step: AnalyticsViewsByStep, index: number) => {
    if (hasExplicitGoalStep) {
      return step.explicitCompletionStep;
    }
    return index === viewsByStep.length - 1;
  };

  const handleOpenDialog = (step: AnalyticsViewsByStep) => {
    setSelectedStep(step);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row items-center">
            <div className="grow">{t('contents.analytics.steps.title')}</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-72">{t('contents.analytics.steps.step')}</TableHead>
                <TableHead className="w-28 text-right">
                  {t('contents.analytics.steps.uniqueViews')}
                </TableHead>
                <TableHead className="w-6" />
                <TableHead className="w-28 text-right">
                  {t('contents.analytics.steps.viewRate')}
                </TableHead>
                <TableHead className="w-6" />
                <TableHead />
                <TableHead className="w-28 text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-end cursor-help">
                          <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('contents.analytics.steps.tooltipTargetNotFound')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="w-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewsByStep.length > 0 ? (
                viewsByStep.map((step: AnalyticsViewsByStep, index) => {
                  const viewRate = calculateRate(
                    step.analytics.uniqueViews,
                    analyticsData?.uniqueViews ?? 0,
                  );
                  return (
                    <TableRow key={index}>
                      <TableCell className="py-[1px]">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="truncate" title={step.name}>
                            {step.name}
                          </span>
                          {isGoalStep(step, index) && <GoalStepBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="py-[1px] text-right">
                        {step.analytics.uniqueViews}
                      </TableCell>
                      <TableCell className="py-[1px] w-6" />
                      <TableCell className="py-[1px] text-right">{viewRate}%</TableCell>
                      <TableCell className="py-[1px] w-6" />
                      <TableCell className="py-[1px] px-0">
                        <div
                          className="h-9 bg-gradient-to-r from-success/50 to-success max-w-full"
                          style={{
                            width: `${viewRate}%`,
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-[1px] text-right">
                        {(() => {
                          const failureRate = calculateUniqueFailureRate(
                            step.analytics.uniqueTooltipTargetMissingCount ?? 0,
                            step.analytics.uniqueViews || 0,
                          );
                          return failureRate === 0 || step.type !== StepContentType.TOOLTIP ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="text-destructive cursor-pointer hover:underline underline-offset-4"
                                    onClick={() => handleOpenDialog(step)}
                                  >
                                    {failureRate}%
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('contents.analytics.steps.clickToViewTargetsNotFound')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="py-[1px] w-6" />
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
