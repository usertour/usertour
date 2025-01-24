import { ContentDetailProvider } from "@/contexts/content-detail-context";
import { ContentVersionProvider } from "@/contexts/content-version-context";
import { SegmentListProvider } from "@/contexts/segment-list-context";
import { ContentListProvider } from "@/contexts/content-list-context";
import { ContentVersionListProvider } from "@/contexts/content-version-list-context";
import { ThemeListProvider } from "@/contexts/theme-list-context";
import { useAppContext } from "@/contexts/app-context";
import { ContentDetailSettings } from "./content-detail-settings";
import { ContentDetailContent } from "./content-detail-content";
import { ContentDetailHeader } from "./content-detail-header";
import { ContentDetailVersion } from "../version/content-detail-version";
import { ContentDetailAnalytics } from "../version/content-detail-analytics";
import { ContentLocalizationList } from "../version/content-localization-list";
import { ContentTypeName } from "@usertour-ui/types";

interface FlowDetailProps {
  contentId: string;
  type: string;
}
export const FlowDetail = (props: FlowDetailProps) => {
  const { contentId, type } = props;
  const { project, environment } = useAppContext();

  return (
    <SegmentListProvider
      environmentId={environment?.id}
      bizType={["COMPANY", "USER"]}
    >
      <ContentListProvider
        environmentId={environment?.id}
        key={"environmentId"}
        contentType={ContentTypeName.FLOWS}
        defaultPagination={{ pageSize: 100, pageIndex: 0 }}
      >
        <ContentDetailProvider
          contentId={contentId}
          contentType={ContentTypeName.FLOWS}
        >
          <ContentVersionProvider>
            <ContentVersionListProvider contentId={contentId}>
              <ContentDetailHeader />
              {type == "detail" && (
                <ThemeListProvider projectId={project?.id}>
                  <div className="p-14 mt-12 ">
                    <div className="flex flex-row space-x-8 justify-center max-w-screen-xl mx-auto">
                      <ContentDetailSettings />
                      <ContentDetailContent />
                    </div>
                  </div>
                </ThemeListProvider>
              )}
              {type == "versions" && <ContentDetailVersion />}
              {type == "analytics" && (
                <ContentDetailAnalytics contentId={contentId} />
              )}
              {type == "localization" && <ContentLocalizationList />}
            </ContentVersionListProvider>
          </ContentVersionProvider>
        </ContentDetailProvider>
      </ContentListProvider>
    </SegmentListProvider>
  );
};

FlowDetail.displayName = "FlowDetail";
