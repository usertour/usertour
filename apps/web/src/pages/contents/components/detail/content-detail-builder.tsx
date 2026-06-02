import { ContentLoading } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useSubscription } from '@/hooks/use-subscription';
import { WebBuilder } from '@usertour/builder';
import { WebBuilder as WebBuilderNext } from '@usertour/builder-v2';
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
  const { contentId, versionId, projectId, environmentId, contentType, initialStepIndex } = props;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Dev/QA toggle for the V2 builder. V2 is a fork of V1 plus an
  // architecture refactor (Zustand + immer + save FSM + leave blocker);
  // visual/behavior contract stays identical until flipped. After
  // verification we'll flip the default in this file (`!== 'v1'`) and
  // V1 becomes the opt-out path.
  const useV2 = searchParams.get('builder') === 'v2';
  const { loading: environmentLoading, environmentList } = useEnvironmentList();
  const { loading: attributeLoading, attributeList } = useAttributeList();
  const { loading: subscriptionLoading, shouldShowMadeWith, subscription } = useSubscription();
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
    return <ContentLoading message={t('common.loading')} />;
  }

  // V1 and V2 have diverged: V2 owns its `?step` deep-link internally and is
  // web-only, so it takes a minimal prop set. V1 keeps the host-driven
  // initialStepIndex / onStepIndexChange + usertourjsUrl contract.
  if (useV2) {
    return (
      <WebBuilderNext
        contentId={contentId}
        versionId={versionId}
        projectId={projectId}
        environmentId={environmentId}
        onSaved={handleOnSaved}
        shouldShowMadeWith={shouldShowMadeWith}
      />
    );
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
