import { createContext, useMemo, useRef } from 'react';
import { useAutoSave } from '@/pages/contents/components/builder/core/lifecycle/use-auto-save';
import { useContentLoader } from '@/pages/contents/components/builder/core/lifecycle/use-content-loader';
import { useSaveContent } from '@/pages/contents/components/builder/core/lifecycle/use-save-content';
import { useUndoShortcuts } from '@/pages/contents/components/builder/core/lifecycle/use-undo-shortcuts';
import {
  type BuilderStore,
  createBuilderStore,
} from '@/pages/contents/components/builder/core/builder-store';
import { BuilderLeaveGuard } from '@/pages/contents/components/builder/core/lifecycle/leave-guard';
import type {
  BuilderProviderContextValue,
  BuilderProviderProps,
} from '@/pages/contents/components/builder/core/types';

// The React Context object. The four public access hooks
// (useBuilderStore / useBuilderMethods / useBuilderConfig /
// useBuilderContentRef) import it from this file.
export const BuilderProviderContext = createContext<BuilderProviderContextValue | null>(null);

export const BuilderProvider = (props: BuilderProviderProps) => {
  const {
    children,
    onSaved,
    shouldShowMadeWith = true,
    environmentId,
    projectId,
    contentId,
    versionId,
  } = props;

  // One store per mount — the `useRef + if (!current)` idiom is the
  // standard Zustand-with-Provider pattern (calling createBuilderStore
  // unguarded would re-create the store on every render and discard
  // state).
  const storeRef = useRef<BuilderStore>();
  if (!storeRef.current) {
    storeRef.current = createBuilderStore();
  }
  const store = storeRef.current;
  const contentRef = useRef<HTMLDivElement | undefined>();

  // Compose the Provider's behaviours. Each hook owns one concern and
  // returns whatever the next hook (or the public surface) needs.
  const { fetchContentAndVersion } = useContentLoader({ store });
  const { saveContent } = useSaveContent({ store, fetchContentAndVersion });
  const { setAutoSaveValidator } = useAutoSave({ store, saveContent });
  useUndoShortcuts({ store });

  // The three imperative methods are each individually ref-stable now: every
  // one is a useCallback whose deps are all stable — the Apollo
  // mutation/lazy-query `invoke`s they close over are themselves useCallback'd
  // in gql.ts, `store` is per-mount, `toast` is a stable useCallback. So we
  // memo the methods object directly on their identities. (This used to be a
  // useRef + useMemo-of-`[]` thunk that pinned the identity to paper over
  // unstable invokes — which once compounded into an infinite render loop; the
  // root cause is fixed, so that workaround is gone.)
  const methods = useMemo<BuilderProviderContextValue['methods']>(
    () => ({ fetchContentAndVersion, saveContent, setAutoSaveValidator }),
    [fetchContentAndVersion, saveContent, setAutoSaveValidator],
  );

  // Provider value is memoized on methods + config so its
  // identity is pinned for the Provider mount lifetime.
  const providerValue = useMemo<BuilderProviderContextValue>(
    () => ({
      store,
      methods,
      config: {
        onSaved,
        shouldShowMadeWith,
        zIndex: 0,
        environmentId,
        projectId,
        contentId,
        versionId,
      },
      contentRef,
    }),
    [store, methods, onSaved, shouldShowMadeWith, environmentId, projectId, contentId, versionId],
  );

  return (
    <BuilderProviderContext.Provider value={providerValue}>
      <BuilderLeaveGuard />
      {children}
    </BuilderProviderContext.Provider>
  );
};
