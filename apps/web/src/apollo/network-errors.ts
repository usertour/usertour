// The Apollo error link is not React, and the user-facing notice is. This is
// the seam between them: the link reports a network failure here, and the
// QueryErrorNotifier mounted in the tree listens and shows one notice.

export interface NetworkFailure {
  operationName: string;
  error: Error;
}

type Listener = (failure: NetworkFailure) => void;

const listeners = new Set<Listener>();

export const onNetworkFailure = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const reportNetworkFailure = (failure: NetworkFailure): void => {
  for (const listener of listeners) {
    listener(failure);
  }
};
