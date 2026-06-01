import { useEffect, useRef } from 'react';
import { BuilderMode, useBuilderStore } from '../contexts';
import { BuilderProvider } from '../provider/builder-provider';
import { useBuilderInit } from '../provider/use-builder-init';
import { useListsLoading } from '../hooks/use-lists-loading';
import { useSyncCurrentTheme } from '../hooks/use-sync-current-theme';
import { WebBuilderLoading } from '../components/web-builder-loading';
import { MODE_COMPONENTS } from './mode-component-map';

const Container = () => {
  useSyncCurrentTheme();
  const currentMode = useBuilderStore((state) => state.currentMode);
  const Active = MODE_COMPONENTS[currentMode.mode];
  return Active ? <Active /> : null;
};

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

// Inner content — runs inside BuilderProvider. Drives init and observes
// the shared lists' loading, then gates on a single combined signal
// before handing off to the mode router.
function WebBuilderContent(props: WebBuilderContentProps) {
  const { contentId, versionId, initialStepIndex } = props;
  const currentMode = useBuilderStore((state) => state.currentMode);
  const currentIndex = useBuilderStore((state) => state.currentIndex);
  const listsLoading = useListsLoading();
  const { ready } = useBuilderInit({ contentId, versionId, initialStepIndex });
  const onStepIndexChangeRef = useRef(props.onStepIndexChange);

  useEffect(() => {
    onStepIndexChangeRef.current = props.onStepIndexChange;
  }, [props.onStepIndexChange]);

  // Mirror the active step into the URL (store → URL). Only after `ready`
  // so it can't clobber the initial ?step before useBuilderInit reads it.
  useEffect(() => {
    if (!ready) {
      return;
    }
    const isStepMode =
      currentMode.mode === BuilderMode.FLOW_STEP_DETAIL ||
      currentMode.mode === BuilderMode.FLOW_STEP_TRIGGER;
    onStepIndexChangeRef.current?.(isStepMode ? currentIndex : undefined);
  }, [currentMode.mode, currentIndex, ready]);

  if (!ready || listsLoading) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  return <Container />;
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
