import { Sidebar } from "@/pages/contents/components/shared/sidebar";
import { useParams } from "react-router-dom";
import { FlowListContent } from "./components/list/flow-list";
import { ContentListProvider } from "@/contexts/content-list-context";
import { TrackersSidebar } from "./components/shared/sidebar-trackers";
import { useAppContext } from "@/contexts/app-context";
import { ThemeListProvider } from "@/contexts/theme-list-context";
import { LauncherListContent } from "./components/list/launcher-list";
import { BannerListContent } from "./components/list/banner-list";
import { ChecklistListContent } from "./components/list/checklist-list";
import { SurveyListContent } from "./components/list/survey-list";
import { NpsListContent } from "./components/list/nps-list";
import { ScrollArea } from "@usertour-ui/scroll-area";
import { ContentListSidebar } from "./components/shared/content-list-sidebar";

export const ContentList = () => {
  const { contentType } = useParams();
  const { environment, project } = useAppContext();

  if (!contentType) {
    return <></>;
  }

  return (
    <>
      <ContentListProvider
        environmentId={environment?.id}
        key={"environmentId"}
        contentType={contentType}
      >
        <ThemeListProvider projectId={project?.id}>
          <ContentListSidebar className="hidden lg:block flex-none w-72 pt-2 mr-4" />

          <ScrollArea className="h-full w-full ">
            <div className="flex space-y-4 p-8 lg:pt-0 lg:pl-0 ">
              {(contentType == "flows" || contentType == "content") && (
                <FlowListContent />
              )}
              {contentType == "launchers" && <LauncherListContent />}
              {contentType == "banners" && <BannerListContent />}
              {contentType == "checklists" && <ChecklistListContent />}
              {contentType == "surveys" && <SurveyListContent />}
              {contentType == "nps" && <NpsListContent />}
            </div>
          </ScrollArea>
        </ThemeListProvider>
      </ContentListProvider>
    </>
  );
};

ContentList.displayName = "ContentList";
