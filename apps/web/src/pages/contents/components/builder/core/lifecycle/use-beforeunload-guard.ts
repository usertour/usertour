import { useEvent } from 'react-use';
import { useStore } from 'zustand';
import type { BuilderStore } from '../builder-store';

export interface UseBeforeunloadGuardArgs {
  store: BuilderStore;
}

// Browser-level `beforeunload` guard — warns the user on tab close /
// hard reload if either the initial content load is still in flight
// or there are unsaved local edits (saveState in dirty/saving).
//
// The in-React-Router navigation guard (intercepting Link clicks /
// history.pushState) is a separate component, BuilderLeaveGuard,
// mounted inside the Provider's JSX tree.
export const useBeforeunloadGuard = (args: UseBeforeunloadGuardArgs): void => {
  const { store } = args;
  const isLoading = useStore(store, (s) => s.isLoading);
  const saveState = useStore(store, (s) => s.saveState);
  useEvent('beforeunload', (event: BeforeUnloadEvent) => {
    const saveInFlight = saveState.status === 'saving' || saveState.status === 'dirty';
    if (isLoading || saveInFlight) {
      event.preventDefault();
    }
  });
};
