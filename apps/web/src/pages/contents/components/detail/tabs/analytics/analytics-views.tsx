import { useContentAnalytics } from '@/hooks/use-content-analytics';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { Card, CardContent, CardHeader, CardTitle, QuestionTooltip } from '@usertour/ui';
import { AnalyticsGrowthIcon, AnalyticsUserIcon } from '@usertour/icons';
import { AnalyticsData, ContentDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { AnalyticsViewsSkeleton } from './analytics-skeleton';

interface AnalyticsViewsProps {
  analyticsData: AnalyticsData;
}

interface AnalyticsCardProps {
  title: string;
  tooltip: string;
  value: string | number;
  icon: React.ReactNode;
}

const AnalyticsCard = ({ title, tooltip, value, icon }: AnalyticsCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium flex flex-row items-center gap-1 text-muted-foreground">
        {title}
        <QuestionTooltip>{tooltip}</QuestionTooltip>
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent className="text-3xl font-bold">{value}</CardContent>
  </Card>
);

const calculateCompletionRate = (completions: number, views: number): string => {
  if (!views) return '0%';
  return `${Math.round((completions / views) * 100)}%`;
};

interface AnalyticsViewsGridProps {
  analyticsData: AnalyticsData;
  tooltips: {
    uniqueViews: string;
    uniqueCompletionRate: string;
    totalViews: string;
    totalCompletionRate: string;
  };
  titles?: {
    uniqueViews: string;
    uniqueCompletionRate: string;
    totalViews: string;
    totalCompletionRate: string;
  };
}

const AnalyticsViewsGrid = ({ analyticsData, tooltips, titles }: AnalyticsViewsGridProps) => {
  const { t } = useTranslation();
  const resolvedTitles = titles ?? {
    uniqueViews: t('contents.analytics.views.uniqueViews'),
    uniqueCompletionRate: t('contents.analytics.views.uniqueCompletionRate'),
    totalViews: t('contents.analytics.views.totalViews'),
    totalCompletionRate: t('contents.analytics.views.totalCompletionRate'),
  };
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <AnalyticsCard
        title={resolvedTitles.uniqueViews}
        tooltip={tooltips.uniqueViews}
        value={analyticsData?.uniqueViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={resolvedTitles.uniqueCompletionRate}
        tooltip={tooltips.uniqueCompletionRate}
        value={calculateCompletionRate(
          analyticsData?.uniqueCompletions || 0,
          analyticsData?.uniqueViews || 0,
        )}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={resolvedTitles.totalViews}
        tooltip={tooltips.totalViews}
        value={analyticsData?.totalViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={resolvedTitles.totalCompletionRate}
        tooltip={tooltips.totalCompletionRate}
        value={calculateCompletionRate(
          analyticsData?.totalCompletions || 0,
          analyticsData?.totalViews || 0,
        )}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
};

const LauncherAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnalyticsCard
        title={t('contents.analytics.views.uniqueViews')}
        tooltip={t('contents.analytics.views.launcher.uniqueViewsTooltip')}
        value={analyticsData?.uniqueViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={t('contents.analytics.views.launcher.activationRate')}
        tooltip={t('contents.analytics.views.launcher.activationRateTooltip')}
        value={calculateCompletionRate(
          analyticsData?.uniqueCompletions || 0,
          analyticsData?.uniqueViews || 0,
        )}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
};

const BannerAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnalyticsCard
        title={t('contents.analytics.views.uniqueViews')}
        tooltip={t('contents.analytics.views.banner.uniqueViewsTooltip')}
        value={analyticsData?.uniqueViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={t('contents.analytics.views.banner.dismissals')}
        tooltip={t('contents.analytics.views.banner.dismissalsTooltip')}
        value={analyticsData?.uniqueCompletions || 0}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
};

const FlowAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <AnalyticsViewsGrid
      analyticsData={analyticsData}
      tooltips={{
        uniqueViews: t('contents.analytics.views.flow.uniqueViewsTooltip'),
        uniqueCompletionRate: t('contents.analytics.views.flow.uniqueCompletionRateTooltip'),
        totalViews: t('contents.analytics.views.flow.totalViewsTooltip'),
        totalCompletionRate: t('contents.analytics.views.flow.totalCompletionRateTooltip'),
      }}
    />
  );
};

const ChecklistAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <AnalyticsViewsGrid
      analyticsData={analyticsData}
      tooltips={{
        uniqueViews: t('contents.analytics.views.checklist.uniqueViewsTooltip'),
        uniqueCompletionRate: t('contents.analytics.views.checklist.uniqueCompletionRateTooltip'),
        totalViews: t('contents.analytics.views.checklist.totalViewsTooltip'),
        totalCompletionRate: t('contents.analytics.views.checklist.totalCompletionRateTooltip'),
      }}
    />
  );
};

const ResourceCenterAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AnalyticsCard
        title={t('contents.analytics.views.resourceCenter.uniqueUserInteractions')}
        tooltip={t('contents.analytics.views.resourceCenter.uniqueUserInteractionsTooltip')}
        value={analyticsData?.uniqueViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={t('contents.analytics.views.resourceCenter.uniqueClickers')}
        tooltip={t('contents.analytics.views.resourceCenter.uniqueClickersTooltip')}
        value={analyticsData?.uniqueCompletions || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={t('contents.analytics.views.resourceCenter.clickThroughRate')}
        tooltip={t('contents.analytics.views.resourceCenter.clickThroughRateTooltip')}
        value={calculateCompletionRate(
          analyticsData?.uniqueCompletions || 0,
          analyticsData?.uniqueViews || 0,
        )}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
};

const TrackerAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnalyticsCard
        title={t('contents.analytics.views.tracker.uniqueEvents')}
        tooltip={t('contents.analytics.views.tracker.uniqueEventsTooltip')}
        value={analyticsData?.uniqueViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={t('contents.analytics.views.tracker.events')}
        tooltip={t('contents.analytics.views.tracker.eventsTooltip')}
        value={analyticsData?.totalViews || 0}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
};

export const AnalyticsViews = () => {
  const { analyticsData, loading } = useContentAnalytics();
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const contentType = content?.type;

  if (loading) {
    return <AnalyticsViewsSkeleton />;
  }

  if (!content || !analyticsData) {
    return null;
  }
  if (contentType === ContentDataType.TRACKER) {
    return <TrackerAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.ANNOUNCEMENT) {
    // An announcement is seen once per user (ANNOUNCEMENT_SEEN is first-seen
    // only), so its only metric is Views. A lone number in its own Overview
    // card reads as an empty card, so it lives in the Performance card header
    // (see AnalyticsDays) alongside the views trend instead.
    return null;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.BANNER) {
    return <BannerAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return <ResourceCenterAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.FLOW) {
    return <FlowAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return <ChecklistAnalyticsViews analyticsData={analyticsData} />;
  }
  return null;
};

AnalyticsViews.displayName = 'AnalyticsViews';
