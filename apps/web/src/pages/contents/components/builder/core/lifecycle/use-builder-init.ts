import { useEffect, useState } from 'react';
import { useBuilderConfig } from '../access/use-builder-config';
import { useBuilderMethods } from '../access/use-builder-methods';
import { useBuilderStore } from '../access/use-builder-store';

// The whole builder load lifecycle, in one place. contentId / versionId come
// from config (the Provider's identity); the effect is keyed on them, so a
// change re-hydrates — defensive, since in the route-mounted web app they're
// stable per mount. Hydration stays controlled one-way (server → store draft
// via fetchContentAndVersion); the draft model is deliberate, this hook never
// binds the cache.
//
// Invariants: I1 hydrate only here + on save re-baseline; I2 re-run on id
// change; I3 clearHistory only on initial load (not on save's
// fetchContentAndVersion); I4 single `ready` gate. The active sub-view is NOT
// seeded here — it's URL-driven (each type's router seeds its edit buffer from
// the route param on mount), so init just fetches, baselines, and unblocks.
export const useBuilderInit = (): { ready: boolean } => {
  // contentId / versionId are immutable config — the Provider's identity.
  const { contentId, versionId } = useBuilderConfig();
  const { fetchContentAndVersion } = useBuilderMethods();
  const clearHistory = useBuilderStore((s) => s.clearHistory);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    (async () => {
      const result = await fetchContentAndVersion(contentId, versionId);
      if (cancelled) {
        return;
      }
      // I3: the freshly-fetched version is the undo origin. On fetch failure
      // (e.g. soft-deleted) currentContent stays undefined and the dispatcher
      // renders nothing — just unblock.
      if (result) {
        clearHistory();
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, versionId]);

  return { ready };
};
