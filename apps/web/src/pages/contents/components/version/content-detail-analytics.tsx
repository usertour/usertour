import { AnalyticsViews } from "../analytics/analytics-views";
import { AnalyticsHeader } from "../analytics/analytics-header";
import { AnalyticsDays } from "../analytics/analytics-days";
import { AnalyticsProvider } from "@/contexts/analytics-context";
import { AnalyticsSteps } from "../analytics/analytics-steps";
import { AnalyticsSessions } from "../analytics/analytics-sessions";
import { BizSessionProvider } from "@/contexts/biz-session-context";
import { EventListProvider } from "@/contexts/event-list-context";
import { useAppContext } from "@/contexts/app-context";
import { useContentDetailContext } from "@/contexts/content-detail-context";
import { ContentDataType } from "@usertour-ui/types";
import { AnalyticsTasks } from "../analytics/analytics-tasks";

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
                {contentType === ContentDataType.CHECKLIST && (
                  <AnalyticsTasks />
                )}
                <AnalyticsSessions />
              </div>
            </div>
          </EventListProvider>
        </BizSessionProvider>
      </AnalyticsProvider>
    </>
  );
};

ContentDetailAnalytics.displayName = "ContentDetailAnalytics";
