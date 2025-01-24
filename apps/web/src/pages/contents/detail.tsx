import { useParams } from "react-router-dom";
import { FlowDetail } from "./components/detail/flow-detail";
import { ContentTypeName } from "@usertour-ui/types";
import { LauncherDetail } from "./launcher/launcher-detail";
import { ChecklistDetail } from "./checklist/detail";
import { BannerDetail } from "./banner/detail";
import { NpsDetail } from "./nps/detail";
import { SurveyDetail } from "./survey/detail";

export const ContentDetail = ({}) => {
  const { contentId = "", contentType, type } = useParams();

  if (!type) {
    return <></>;
  }

  return (
    <>
      {contentType == ContentTypeName.FLOWS && (
        <FlowDetail contentId={contentId} type={type} />
      )}
      {contentType == ContentTypeName.LAUNCHERS && (
        <LauncherDetail contentId={contentId} type={type} />
      )}
      {contentType == ContentTypeName.CHECKLISTS && (
        <ChecklistDetail contentId={contentId} type={type} />
      )}
      {contentType == ContentTypeName.BANNERS && (
        <BannerDetail contentId={contentId} type={type} />
      )}
      {contentType == ContentTypeName.NPS && (
        <NpsDetail contentId={contentId} type={type} />
      )}
      {contentType == ContentTypeName.SURVEYS && (
        <SurveyDetail contentId={contentId} type={type} />
      )}
    </>
  );
};

ContentDetail.displayName = "ContentDetail";
