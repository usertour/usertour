import { AnalyticsProvider } from '@/contexts/analytics-context';
import { useAppContext } from '@/contexts/app-context';
import { BizSessionProvider } from '@/contexts/biz-session-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { EventListProvider } from '@/contexts/event-list-context';
import { ContentDataType } from '@usertour-ui/types';
import { AnalyticsDays } from '../analytics/analytics-days';
import { AnalyticsHeader } from '../analytics/analytics-header';
import { AnalyticsSessions } from '../analytics/analytics-sessions';
import { AnalyticsSteps } from '../analytics/analytics-steps';
import { AnalyticsTasks } from '../analytics/analytics-tasks';
import { AnalyticsViews } from '../analytics/analytics-views';
import { AnalyticsQuestion } from '../analytics/analytics-question';

export const ContentDetailAnalytics = (props: { contentId: string }) => {
  const { contentId } = props;
  const { project } = useAppContext();
  const { content } = useContentDetailContext();
  const contentType = content?.type;
  if (!contentType) {
    return null;
  }

  return (
    <>
      <AnalyticsProvider contentId={contentId}>
        <BizSessionProvider contentId={contentId}>
          <EventListProvider projectId={project?.id}>
            <div className="p-14 mt-12 ">
              <div className="space-y-4 justify-center flex flex-col  max-w-screen-xl mx-auto">
                <AnalyticsHeader />
                <AnalyticsViews />
                <AnalyticsDays />
                {contentType === ContentDataType.FLOW && <AnalyticsSteps />}
                {contentType === ContentDataType.FLOW && (
                  <AnalyticsQuestion contentId={contentId} />
                )}
                {contentType === ContentDataType.CHECKLIST && <AnalyticsTasks />}
                <AnalyticsSessions />
              </div>
            </div>
          </EventListProvider>
        </BizSessionProvider>
      </AnalyticsProvider>
    </>
  );
};

ContentDetailAnalytics.displayName = 'ContentDetailAnalytics';
