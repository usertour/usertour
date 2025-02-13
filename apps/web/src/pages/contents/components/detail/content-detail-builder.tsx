import { WebBuilder } from '@usertour-ui/builder';
import { useNavigate } from 'react-router-dom';

interface ContentDetailBuilderProps {
  contentId: string;
  versionId: string;
  projectId: string;
  environmentId: string;
  envToken: string;
  contentType: string;
}
export const ContentDetailBuilder = (props: ContentDetailBuilderProps) => {
  const { contentId, environmentId, contentType } = props;
  const navigate = useNavigate();

  const handleOnSaved = async () => {
    const url = `/env/${environmentId}/${contentType}/${contentId}/detail`;
    navigate(url);
  };

  return (
    <WebBuilder
      {...props}
      onSaved={handleOnSaved}
      usertourjsUrl={`${import.meta.env.VITE_USERTOUR_JSURL}`}
    />
  );
};

ContentDetailBuilder.displayName = 'ContentDetailBuilder';
