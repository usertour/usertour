import { ContentLoading } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { WebBuilder } from '@usertour/builder';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [, setSearchParams] = useSearchParams();
  const { loading: environmentLoading, environmentList } = useEnvironmentListContext();
  const { loading: attributeLoading, attributeList } = useAttributeListContext();
  const {
    loading: subscriptionLoading,
    shouldShowMadeWith,
    subscription,
  } = useSubscriptionContext();
  const { loading: appLoading } = useAppContext();
  const { t } = useTranslation();

  // Mirror the active step into the URL so refresh / browser back keep the
  // user in the same panel. Use replace so internal mode flips don't pollute
  // history (only true page navigations should add entries).
  const handleStepIndexChange = useCallback(
    (stepIndex: number | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const current = next.get('step');
          const desired = stepIndex !== undefined ? String(stepIndex) : null;
          if (current === desired) {
            return prev;
          }
          if (desired === null) {
            next.delete('step');
          } else {
            next.set('step', desired);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleOnSaved = async () => {
    const url = `/env/${environmentId}/${contentType}/${contentId}/detail`;
    navigate(url);
  };

  // Distinguish first-load from background refetch. With the four
  // AdminProvidersOutlet Context providers participating in the
  // normalized cache, any mutation that carries
  // `refetchQueries: ['listAttributes' | 'getUserEnvironments' | ...]`
  // — e.g. creating an attribute from the builder's "Bind to user
  // attribute" UI — will flip the Provider's `loading` to true while
  // it refetches. Treating that the same as first-load would unmount
  // the entire WebBuilder, blank the screen, and remount it once the
  // refetch lands — i.e. exactly the "page reloads after creating
  // attribute" regression. Gate the loading screen on "loading AND
  // no data yet" so subsequent refetches keep the builder rendered.
  const isLoading =
    appLoading ||
    (environmentLoading && !environmentList) ||
    (attributeLoading && !attributeList) ||
    (subscriptionLoading && !subscription);

  if (isLoading) {
    return <ContentLoading message={t('common.loading')} />;
  }

  return (
    <WebBuilder
      {...props}
      initialStepIndex={initialStepIndex}
      onStepIndexChange={handleStepIndexChange}
      onSaved={handleOnSaved}
      usertourjsUrl={`${import.meta.env.VITE_USERTOUR_JSURL}`}
      shouldShowMadeWith={shouldShowMadeWith}
    />
  );
};

ContentDetailBuilder.displayName = 'ContentDetailBuilder';
