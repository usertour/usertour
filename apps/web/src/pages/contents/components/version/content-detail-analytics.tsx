import { AnalyticsProvider } from '@/contexts/analytics-context';
import { BizSessionProvider } from '@/contexts/biz-session-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { ContentDataType } from '@usertour/types';
import { AnalyticsDays } from '../analytics/analytics-days';
import { AnalyticsHeader } from '../analytics/analytics-header';
import { AnalyticsSessions } from '../analytics/analytics-sessions';
import { AnalyticsSteps } from '../analytics/analytics-steps';
import { AnalyticsTasks } from '../analytics/analytics-tasks';
import { AnalyticsViews } from '../analytics/analytics-views';
import { AnalyticsQuestion } from '../analytics/analytics-question';
import { AnalyticsTrackerUsers } from '../analytics/analytics-tracker-users';

export const ContentDetailAnalytics = (props: { contentId: string }) => {
  const { contentId } = props;
  const { content } = useContentDetailContext();
  const contentType = content?.type;
  if (!contentType) {
    return null;
  }

  const isTracker = contentType === ContentDataType.TRACKER;

  return (
    <>
      <AnalyticsProvider contentId={contentId}>
        <BizSessionProvider contentId={contentId}>
          <div className="p-14 mt-12 ">
            <div className="space-y-4 justify-center flex flex-col  max-w-screen-xl mx-auto">
              <AnalyticsHeader />
              <AnalyticsViews />
              <AnalyticsDays />
              {contentType === ContentDataType.FLOW && <AnalyticsSteps />}
              {contentType === ContentDataType.FLOW && <AnalyticsQuestion contentId={contentId} />}
              {contentType === ContentDataType.CHECKLIST && <AnalyticsTasks />}
              {isTracker && <AnalyticsTrackerUsers contentId={contentId} />}
              {!isTracker && <AnalyticsSessions />}
            </div>
          </div>
        </BizSessionProvider>
      </AnalyticsProvider>
    </>
  );
};

ContentDetailAnalytics.displayName = 'ContentDetailAnalytics';
