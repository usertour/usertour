import type { FieldMergeFunction } from '@apollo/client';

/**
 * Merge for a nullable list field that the server resolves with its own
 * query: a `null` next to a field error means "could not deliver", not
 * "there is nothing", so it must not erase the list the cache already
 * holds. With the app-wide `errorPolicy: 'all'`, Apollo writes such a
 * partial result into the cache; without this merge, one failed re-read
 * mid-session would turn a known list into an unknown one for every
 * observer of the field. An explicit refetch() reaches this merge only
 * when the query sets `refetchWritePolicy: 'merge'` (the default write
 * clears `existing` first) — `useCurrentUser` does.
 *
 * First load: nothing is known yet, so `null` stays `null` (unknown).
 * Later: the previous list wins over `null`; a delivered list replaces it.
 */
export const keepKnownList: FieldMergeFunction<unknown[] | null> = (existing, incoming) => {
  if (incoming === null) {
    return existing ?? null;
  }
  return incoming;
};
