import { AnalyticsUIProvider } from '@/contexts/analytics-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { ContentDataType } from '@usertour/types';
import { AnalyticsDays } from '../analytics/analytics-days';
import { AnalyticsHeader } from '../analytics/analytics-header';
import { AnalyticsSessions } from '../analytics/analytics-sessions';
import { AnalyticsSteps } from '../analytics/analytics-steps';
import { AnalyticsTasks } from '../analytics/analytics-tasks';
import { AnalyticsViews } from '../analytics/analytics-views';
import { AnalyticsQuestion } from '../analytics/analytics-question';
import { AnalyticsTrackerUsers } from '../analytics/analytics-tracker-users';
import { AnalyticsBlocks } from '../analytics/analytics-blocks';

export const ContentDetailAnalytics = (props: { contentId: string }) => {
  const { contentId } = props;
  const { content } = useContentDetail(contentId);
  const contentType = content?.type;
  if (!contentType) {
    return null;
  }

  const isEventBased = contentType === ContentDataType.TRACKER;

  return (
    <AnalyticsUIProvider contentId={contentId}>
      <div className="px-6 py-8 xl:px-8">
        <div className="space-y-4 justify-center flex flex-col  max-w-screen-xl mx-auto">
          <AnalyticsHeader />
          <AnalyticsViews />
          <AnalyticsDays />
          {contentType === ContentDataType.FLOW && <AnalyticsSteps />}
          {contentType === ContentDataType.FLOW && <AnalyticsQuestion contentId={contentId} />}
          {contentType === ContentDataType.CHECKLIST && <AnalyticsTasks />}
          {contentType === ContentDataType.RESOURCE_CENTER && <AnalyticsBlocks />}
          {isEventBased && <AnalyticsTrackerUsers contentId={contentId} />}
          {!isEventBased && <AnalyticsSessions />}
        </div>
      </div>
    </AnalyticsUIProvider>
  );
};

ContentDetailAnalytics.displayName = 'ContentDetailAnalytics';
