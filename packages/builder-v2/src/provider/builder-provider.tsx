import { createContext, useMemo, useRef } from 'react';
import { useAutoSave } from './use-auto-save';
import { useBeforeunloadGuard } from './use-beforeunload-guard';
import { useContentLoader } from './use-content-loader';
import { useSaveContent } from './use-save-content';
import { useUndoShortcuts } from './use-undo-shortcuts';
import { type BuilderStore, createBuilderStore } from '../store/builder-store';
import { BuilderLeaveGuard } from '../guards/builder-leave-guard';
import type { BuilderProviderContextValue, BuilderProviderProps } from './types';

// The React Context object. The four public access hooks
// (useBuilderStore / useBuilderMethods / useBuilderConfig /
// useBuilderContentRef) import it from this file.
export const BuilderProviderContext = createContext<BuilderProviderContextValue | null>(null);

export const BuilderProvider = (props: BuilderProviderProps) => {
  const { children, onSaved, shouldShowMadeWith = true } = props;

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
  useBeforeunloadGuard({ store });

  // Ref-stable wrappers for every imperative method exposed via
  // useBuilderMethods. Each underlying useCallback's deps include
  // Apollo hook return refs that are not ref-stable across renders —
  // so the useCallbacks themselves don't memoize, and any consumer
  // that lists one of them in a useEffect / useMemo dep array would
  // re-fire every render. With state changes (e.g. step delete
  // making currentVersion != backupVersion), the re-fire compounds
  // into an infinite render loop. Wrap each method in a useRef +
  // useMemo-of-`[]` thunk so the exposed identity is pinned at first
  // render while still dispatching to the latest closure on every call.
  const methodsRef = useRef({
    fetchContentAndVersion,
    saveContent,
    setAutoSaveValidator,
  });
  methodsRef.current = {
    fetchContentAndVersion,
    saveContent,
    setAutoSaveValidator,
  };
  const stableMethods = useMemo<BuilderProviderContextValue['methods']>(
    () => ({
      fetchContentAndVersion: (cid, vid) => methodsRef.current.fetchContentAndVersion(cid, vid),
      saveContent: () => methodsRef.current.saveContent(),
      setAutoSaveValidator: (fn) => methodsRef.current.setAutoSaveValidator(fn),
    }),
    [],
  );

  // Provider value is memoized on stableMethods + config so its
  // identity is pinned for the Provider mount lifetime.
  const providerValue = useMemo<BuilderProviderContextValue>(
    () => ({
      store,
      methods: stableMethods,
      config: {
        onSaved,
        shouldShowMadeWith,
        zIndex: 0,
      },
      contentRef,
    }),
    [store, stableMethods, onSaved, shouldShowMadeWith],
  );

  return (
    <BuilderProviderContext.Provider value={providerValue}>
      <BuilderLeaveGuard />
      {children}
    </BuilderProviderContext.Provider>
  );
};
