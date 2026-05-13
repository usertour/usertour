import { ContentLoading } from '@/components/molecules/content-loading';
import { useAppContext } from '@/contexts/app-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { WebBuilder } from '@usertour/builder';
import { useCallback } from 'react';
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
  const { loading: environmentLoading } = useEnvironmentListContext();
  const { loading: attributeLoading } = useAttributeListContext();
  const { loading: subscriptionLoading, shouldShowMadeWith } = useSubscriptionContext();
  const { loading: appLoading } = useAppContext();

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

  const isLoading = environmentLoading || attributeLoading || subscriptionLoading || appLoading;

  if (isLoading) {
    return <ContentLoading message="Loading builder..." />;
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
