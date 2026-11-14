import { useContentAnalytics } from '@/hooks/use-content-analytics';
import { Card, CardContent, CardHeader, CardTitle, QuestionTooltip } from '@usertour/ui';
import { AnalyticsViewsByButton } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';

type StepGroup = {
  stepCvid: string;
  stepName: string;
  stepIndex: number;
  totalClicks: number;
  buttons: AnalyticsViewsByButton[];
};

// Steps keep the published order (the server returns rows in step order,
// then document order); buttons within a step sort by clicks so the
// highest-volume ones surface first.
const groupButtonsByStep = (buttons: AnalyticsViewsByButton[]): StepGroup[] => {
  const groups = new Map<string, StepGroup>();
  for (const button of buttons) {
    const existing = groups.get(button.stepCvid);
    if (existing) {
      existing.buttons.push(button);
      existing.totalClicks += button.analytics.totalClicks;
    } else {
      groups.set(button.stepCvid, {
        stepCvid: button.stepCvid,
        stepName: button.stepName,
        stepIndex: button.stepIndex,
        totalClicks: button.analytics.totalClicks,
        buttons: [button],
      });
    }
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    buttons: [...group.buttons].sort(
      (left, right) => right.analytics.totalClicks - left.analytics.totalClicks,
    ),
  }));
};

const getRankDotClass = (rank: number, isIdle: boolean) => {
  if (isIdle) return 'bg-muted-foreground/20';
  if (rank === 0) return 'bg-primary';
  if (rank <= 2) return 'bg-primary/60';
  return 'bg-muted-foreground/30';
};

export const AnalyticsButtons = () => {
  const { analyticsData, loading } = useContentAnalytics();
  const { t } = useTranslation();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  const buttons = Array.isArray(analyticsData?.viewsByButton) ? analyticsData.viewsByButton : [];
  const groups = groupButtonsByStep(buttons);
  const hasAnyClicks = buttons.some((button) => button.analytics.totalClicks > 0);
  // A single step needs no per-step header; the table is just the buttons.
  const showStepHeaders = groups.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          {t('contents.analytics.buttons.title')}
          <QuestionTooltip>{t('contents.analytics.buttons.tooltip')}</QuestionTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyClicks ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.stepCvid}>
                {showStepHeaders && (
                  <div className="flex items-baseline justify-between border-b pb-2 mb-2">
                    <span className="font-medium text-sm">
                      {group.stepIndex + 1}. {group.stepName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('contents.analytics.buttons.totalClicks', { count: group.totalClicks })}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-[auto_1fr_auto_auto] items-center text-[11px] text-muted-foreground px-2 pb-1">
                  <span className="w-2 mr-3" />
                  <span>{t('contents.analytics.buttons.button')}</span>
                  <span className="text-right min-w-[56px]">
                    {t('contents.analytics.buttons.percentOfStep')}
                  </span>
                  <span className="text-right min-w-[96px]">
                    {t('contents.analytics.buttons.clickersClicks')}
                  </span>
                </div>
                <div>
                  {group.buttons.map((button, rank) => {
                    const { uniqueClicks, totalClicks } = button.analytics;
                    const isIdle = totalClicks === 0;
                    const share =
                      group.totalClicks > 0 ? (totalClicks / group.totalClicks) * 100 : 0;
                    return (
                      <div
                        key={`${button.stepCvid}:${button.cvid}`}
                        className={`grid grid-cols-[auto_1fr_auto_auto] items-center rounded-md px-2 py-2 transition-colors hover:bg-muted/50 ${
                          isIdle ? 'opacity-50' : ''
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full mr-3 shrink-0 ${getRankDotClass(
                            rank,
                            isIdle,
                          )}`}
                        />
                        <span className="truncate text-sm">{button.name}</span>
                        <span className="text-sm tabular-nums font-medium text-right min-w-[56px]">
                          {share.toFixed(0)}%
                        </span>
                        <span className="text-sm tabular-nums text-right min-w-[96px]">
                          <span className="font-medium">{uniqueClicks}</span>
                          <span className="text-muted-foreground"> / {totalClicks}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            {t('contents.analytics.buttons.noClicks')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

AnalyticsButtons.displayName = 'AnalyticsButtons';
