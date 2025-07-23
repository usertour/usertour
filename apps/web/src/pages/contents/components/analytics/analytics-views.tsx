import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { AnalyticsGrowthIcon, AnalyticsUserIcon } from '@usertour-packages/icons';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { AnalyticsData, ContentDataType } from '@usertour-packages/types';
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
      <CardTitle className="text-sm font-medium flex flex-row items-center gap-1">
        {title}
        <QuestionTooltip>{tooltip}</QuestionTooltip>
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const calculateCompletionRate = (completions: number, views: number): string => {
  if (!views) return '0%';
  return `${Math.floor((completions / views) * 100)}%`;
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

const AnalyticsViewsGrid = ({
  analyticsData,
  tooltips,
  titles = {
    uniqueViews: 'Unique Views',
    uniqueCompletionRate: 'Unique Completion Rate',
    totalViews: 'Total Views',
    totalCompletionRate: 'Total Completion Rate',
  },
}: AnalyticsViewsGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <AnalyticsCard
      title={titles.uniqueViews}
      tooltip={tooltips.uniqueViews}
      value={analyticsData?.uniqueViews || 0}
      icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
    />
    <AnalyticsCard
      title={titles.uniqueCompletionRate}
      tooltip={tooltips.uniqueCompletionRate}
      value={calculateCompletionRate(
        analyticsData?.uniqueCompletions || 0,
        analyticsData?.uniqueViews || 0,
      )}
      icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
    />
    <AnalyticsCard
      title={titles.totalViews}
      tooltip={tooltips.totalViews}
      value={analyticsData?.totalViews || 0}
      icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
    />
    <AnalyticsCard
      title={titles.totalCompletionRate}
      tooltip={tooltips.totalCompletionRate}
      value={calculateCompletionRate(
        analyticsData?.totalCompletions || 0,
        analyticsData?.totalViews || 0,
      )}
      icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
    />
  </div>
);

const LauncherAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => (
  <AnalyticsViewsGrid
    analyticsData={analyticsData}
    titles={{
      uniqueViews: 'Unique Views',
      uniqueCompletionRate: 'Unique Activation Rate',
      totalViews: 'Total Views',
      totalCompletionRate: 'Total Activation Rate',
    }}
    tooltips={{
      uniqueViews:
        'Views are only counted once per user, meaning even if a user views the launcher multiple times, it will only be counted once',
      uniqueCompletionRate:
        'The activation rate shows the percentage of users who saw the launcher and activated it (e.g. by clicking or hovering over it).',
      totalViews:
        'Views are counted for each visit, so a user will be recorded multiple times for viewing the launcher.',
      totalCompletionRate:
        'The activation rate shows the percentage of visits where the launcher was seen and activated (e.g., by clicking or hovering).',
    }}
  />
);

const FlowAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => (
  <AnalyticsViewsGrid
    analyticsData={analyticsData}
    tooltips={{
      uniqueViews:
        'Unique views indicate the total number of unique users who have seen the flow, while total views may be higher if some users have viewed it multiple times.',
      uniqueCompletionRate:
        'Completion rate shows the percentage of unique users who completed the flow after seeing it.',
      totalViews:
        'Total views indicate the total number of visits to the flow, with each visit counted separately, even if a user views it multiple times.',
      totalCompletionRate:
        'Completion rate shows the percentage of visits where the flow was seen and completed.',
    }}
  />
);

const ChecklistAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => (
  <AnalyticsViewsGrid
    analyticsData={analyticsData}
    tooltips={{
      uniqueViews:
        'Unique views indicate the total number of unique users who have seen the checklist, while total views may be higher if some users have viewed it multiple times.',
      uniqueCompletionRate:
        'Completion rate shows the percentage of unique users who completed the checklist after seeing it.',
      totalViews:
        'Total views indicate the total number of visits to the checklist, with each visit counted separately, even if a user views it multiple times.',
      totalCompletionRate:
        'Completion rate shows the percentage of visits where the checklist was seen and completed.',
    }}
  />
);

export const AnalyticsViews = () => {
  const { analyticsData, loading } = useAnalyticsContext();
  const { content } = useContentDetailContext();
  const contentType = content?.type;

  if (loading) {
    return <AnalyticsViewsSkeleton />;
  }

  if (!content || !analyticsData) {
    return null;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherAnalyticsViews analyticsData={analyticsData} />;
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
