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
import { VersionConflictDialog } from '@/pages/contents/components/builder/core/lifecycle/version-conflict-dialog';
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
  const { saveContent } = useSaveContent({ store });
  const { setAutoSaveValidator } = useAutoSave({ store, saveContent });
  useUndoShortcuts({ store });

  // Provider value is memoized so its identity is pinned for the Provider
  // mount lifetime. The three imperative methods are each individually
  // ref-stable — each a useCallback over stable deps (the Apollo invokes they
  // close over are useCallback'd in gql.ts, `store` is per-mount, `toast` is
  // stable) — so listing them directly in the deps is enough; the methods
  // object is inlined rather than memoized separately.
  const providerValue = useMemo<BuilderProviderContextValue>(
    () => ({
      store,
      methods: { fetchContentAndVersion, saveContent, setAutoSaveValidator },
      config: {
        onSaved,
        shouldShowMadeWith,
        environmentId,
        projectId,
        contentId,
      },
      contentRef,
    }),
    [
      store,
      fetchContentAndVersion,
      saveContent,
      setAutoSaveValidator,
      onSaved,
      shouldShowMadeWith,
      environmentId,
      projectId,
      contentId,
    ],
  );

  return (
    <BuilderProviderContext.Provider value={providerValue}>
      <BuilderLeaveGuard />
      <VersionConflictDialog />
      {children}
    </BuilderProviderContext.Provider>
  );
};
