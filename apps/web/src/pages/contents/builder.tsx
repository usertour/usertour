import { useAppContext } from "@/contexts/app-context";
import { ContentDetailBuilder } from "./components/detail/content-detail-builder";
import { useParams } from "react-router-dom";

export const ContentBuilder = ({}) => {
  const { contentId = "", contentType, versionId } = useParams();
  const { project, environment } = useAppContext();
  if (
    !project ||
    !project.id ||
    !contentId ||
    !versionId ||
    !environment ||
    !contentType
  ) {
    return <></>;
  }
  return (
    <>
      <ContentDetailBuilder
        contentId={contentId}
        versionId={versionId}
        projectId={project?.id}
        environmentId={environment.id}
        envToken={environment.token}
        contentType={contentType}
      />
    </>
  );
};

ContentBuilder.displayName = "ContentBuilder";
