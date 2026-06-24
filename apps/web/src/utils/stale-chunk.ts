// After a deploy, content-hashed JS chunks get new filenames and the old ones
// are removed. A browser still running the previous build requests a now-missing
// chunk on its next lazy import and throws "Failed to fetch dynamically imported
// module". Reloading pulls the fresh index.html (and the new chunk names), so we
// recover automatically instead of showing the router's raw error page.

// Per-engine wording for the same failure.
const STALE_CHUNK_MESSAGES = [
  'Failed to fetch dynamically imported module', // Chromium / Firefox
  'error loading dynamically imported module', // Firefox (alt)
  'Importing a module script failed', // Safari
];

export const isStaleChunkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return STALE_CHUNK_MESSAGES.some((needle) => message.includes(needle));
};

const RELOAD_GUARD_KEY = 'usertour:stale-chunk-reloaded-at';
const RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * Reload once to pick up the freshly deployed assets. Guarded so that a chunk
 * which is genuinely gone (not merely rotated) can't spin the page into a reload
 * loop — at most one reload per short window. Returns whether it reloaded.
 */
export const reloadForStaleChunkOnce = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) {
      return false; // already reloaded very recently — don't loop
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode etc.) — fall through and reload.
  }
  window.location.reload();
  return true;
};
