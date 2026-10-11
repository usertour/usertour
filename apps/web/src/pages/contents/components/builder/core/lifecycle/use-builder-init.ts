import { useEffect, useState } from 'react';
import { useBuilderConfig } from '@/pages/contents/components/builder/core/access/use-builder-config';
import { useBuilderMethods } from '@/pages/contents/components/builder/core/access/use-builder-methods';
import { useBuilderStore } from '@/pages/contents/components/builder/core/access/use-builder-store';

// The whole builder load lifecycle, in one place. contentId comes from
// config (the Provider's identity); the effect is keyed on it, so a
// change re-hydrates — defensive, since in the route-mounted web app it's
// stable per mount. Hydration stays controlled one-way (server → store draft
// via fetchContentAndVersion); the draft model is deliberate, this hook never
// binds the cache.
//
// Invariants: I1 hydrate only here + on save re-baseline; I2 re-run on id
// change; I3 clearHistory only on initial load (not on save's
// fetchContentAndVersion); I4 single `ready` gate. The active sub-view is NOT
// seeded here — it's URL-driven (each type's router seeds its edit buffer from
// the route param on mount), so init just fetches, baselines, and unblocks.
export const useBuilderInit = (): { ready: boolean; failed: boolean; retry: () => void } => {
  // contentId is immutable config — the Provider's identity.
  const { contentId } = useBuilderConfig();
  const { fetchContentAndVersion } = useBuilderMethods();
  const clearHistory = useBuilderStore((s) => s.clearHistory);

  const [ready, setReady] = useState(false);
  // The load failed (the request did not answer), as opposed to the content
  // being gone: the shell shows a retry instead of an empty canvas.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFailed(false);

    (async () => {
      let loaded = false;
      try {
        loaded = await fetchContentAndVersion(contentId);
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
      if (cancelled) {
        return;
      }
      // I3: the freshly-fetched version is the undo origin. On a delivered
      // null (e.g. soft-deleted) currentContent stays undefined and the
      // dispatcher renders nothing — just unblock.
      if (loaded) {
        clearHistory();
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { ready, failed, retry };
};
