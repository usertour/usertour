import { ContentLoading } from '@/components/molecules/content-loading';
import { useAppContext } from '@/contexts/app-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useSubscriptionContext } from '@/contexts/subscription-context';
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
  const { loading: environmentLoading } = useEnvironmentListContext();
  const { loading: attributeLoading } = useAttributeListContext();
  const { loading: subscriptionLoading } = useSubscriptionContext();
  const { loading: appLoading } = useAppContext();

  const handleOnSaved = async () => {
    const url = `/env/${environmentId}/${contentType}/${contentId}/detail`;
    navigate(url);
  };

  const isLoading = environmentLoading || attributeLoading || subscriptionLoading || appLoading;

  if (isLoading) {
    return <ContentLoading message="Loading builder..." />;
  }

  return (
    <WebBuilder
      {...props}
      onSaved={handleOnSaved}
      usertourjsUrl={`${import.meta.env.VITE_USERTOUR_JSURL}`}
    />
  );
};

ContentDetailBuilder.displayName = 'ContentDetailBuilder';
