import { useBuilderStore } from '../contexts';
import { BuilderProvider } from '../provider/builder-provider';
import { useBuilderInit } from '../provider/use-builder-init';
import { useListsLoading } from '../hooks/use-lists-loading';
import { useStepUrlSync } from '../hooks/use-step-url-sync';
import { useSyncCurrentTheme } from '../hooks/use-sync-current-theme';
import { WebBuilderLoading } from '../components/web-builder-loading';
import { MODE_COMPONENTS } from './mode-component-map';

export interface WebBuilderProps {
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  // Accepted for parity with the v1 builder's shared call site in apps/web;
  // web-only v2 has no SDK-preview path that consumes it.
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  isLoading?: boolean;
  initialStepIndex?: number;
  shouldShowMadeWith?: boolean;
  onStepIndexChange?: (stepIndex: number | undefined) => void;
}

interface WebBuilderContentProps {
  contentId: string;
  versionId: string;
  initialStepIndex?: number;
  onStepIndexChange?: (stepIndex: number | undefined) => void;
}

// The builder, inside BuilderProvider: drives init, observes the shared
// lists' loading, syncs the current theme + the ?step URL, gates on a
// single `ready` signal, then routes to the active mode's component.
function WebBuilderContent(props: WebBuilderContentProps) {
  const { contentId, versionId, initialStepIndex, onStepIndexChange } = props;
  const { ready } = useBuilderInit({ contentId, versionId, initialStepIndex });
  const listsLoading = useListsLoading();
  useStepUrlSync(ready, onStepIndexChange);
  useSyncCurrentTheme();
  const currentMode = useBuilderStore((state) => state.currentMode);

  if (!ready || listsLoading) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  const Active = MODE_COMPONENTS[currentMode.mode];
  return Active ? <Active /> : null;
}

export const WebBuilder = (props: WebBuilderProps) => {
  const {
    onSaved,
    shouldShowMadeWith,
    environmentId,
    projectId,
    contentId,
    versionId,
    initialStepIndex,
    onStepIndexChange,
  } = props;
  return (
    <BuilderProvider
      onSaved={onSaved}
      shouldShowMadeWith={shouldShowMadeWith}
      environmentId={environmentId}
      projectId={projectId}
    >
      <WebBuilderContent
        contentId={contentId}
        versionId={versionId}
        initialStepIndex={initialStepIndex}
        onStepIndexChange={onStepIndexChange}
      />
    </BuilderProvider>
  );
};

WebBuilder.displayName = 'WebBuilder';
