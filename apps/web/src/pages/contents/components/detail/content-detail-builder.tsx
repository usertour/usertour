import { ContentLoading } from '@/components/molecules/content-loading';
import { useAppContext } from '@/contexts/app-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { WebBuilder } from '@usertour-packages/builder';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ContentDetailBuilderProps {
  contentId: string;
  versionId: string;
  projectId: string;
  environmentId: string;
  envToken: string;
  contentType: string;
  initialStepIndex?: number;
}
export const ContentDetailBuilder = (props: ContentDetailBuilderProps) => {
  const { contentId, environmentId, contentType, initialStepIndex } = props;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading: environmentLoading } = useEnvironmentListContext();
  const { loading: attributeLoading } = useAttributeListContext();
  const { loading: subscriptionLoading } = useSubscriptionContext();
  const { loading: appLoading } = useAppContext();

  // Clear step query parameter after it's been captured
  useEffect(() => {
    if (searchParams.has('step')) {
      searchParams.delete('step');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      initialStepIndex={initialStepIndex}
      onSaved={handleOnSaved}
      usertourjsUrl={`${import.meta.env.VITE_USERTOUR_JSURL}`}
    />
  );
};

ContentDetailBuilder.displayName = 'ContentDetailBuilder';
