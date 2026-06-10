import { ContentLoading } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useSubscription } from '@/hooks/use-subscription';
import { WebBuilder } from '../builder';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ContentDetailBuilderProps {
  contentId: string;
  versionId: string;
  projectId: string;
  environmentId: string;
  envToken: string;
  contentType: string;
}

export const ContentDetailBuilder = (props: ContentDetailBuilderProps) => {
  const { contentId, versionId, projectId, environmentId, contentType } = props;
  const navigate = useNavigate();
  const { loading: environmentLoading, environmentList } = useEnvironmentList();
  const { loading: attributeLoading, attributeList } = useAttributeList();
  const { loading: subscriptionLoading, shouldShowMadeWith, subscription } = useSubscription();
  const { loading: appLoading } = useAppContext();
  const { t } = useTranslation();

  const handleOnSaved = async () => {
    const url = `/env/${environmentId}/${contentType}/${contentId}/detail`;
    navigate(url);
  };

  // Distinguish first-load from background refetch. The hooks /
  // attribute Context all participate in the normalized cache, so any
  // mutation that carries
  // `refetchQueries: ['listAttributes' | 'getUserEnvironments' | …]`
  // — e.g. creating an attribute from the builder's "Bind to user
  // attribute" UI — will flip `loading` to true while the cache slot
  // refetches. Treating that the same as first-load would unmount the
  // entire WebBuilder, blank the screen, and remount it once the
  // refetch lands — i.e. exactly the "page reloads after creating
  // attribute" regression. Gate the loading screen on "loading AND
  // no data yet" so subsequent refetches keep the builder rendered.
  const isLoading =
    appLoading ||
    (environmentLoading && !environmentList) ||
    (attributeLoading && !attributeList) ||
    (subscriptionLoading && !subscription);

  if (isLoading) {
    return <ContentLoading message={t('common.loading')} className="min-h-screen" />;
  }

  return (
    <WebBuilder
      contentId={contentId}
      versionId={versionId}
      projectId={projectId}
      environmentId={environmentId}
      onSaved={handleOnSaved}
      shouldShowMadeWith={shouldShowMadeWith}
    />
  );
};

ContentDetailBuilder.displayName = 'ContentDetailBuilder';
