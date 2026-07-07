// Cross-tab auth sync. When one tab logs in / out / registers / accepts an
// invite / completes 2FA, all other tabs of the same browser session need
// to reload so they read the now-shared cookies instead of operating on
// stale React state. Without this, a stale tab can silently write to the
// new session's user record (user-scoped mutations bypass the project-level
// E0013 guard) or sit on a project the new session has no access to.
//
// A common cross-tab workspace-switch pattern — single
// module-level BroadcastChannel, posting tab doesn't receive its own
// message (BroadcastChannel spec), receiving tabs hard-navigate to root
// so AppContext re-initialises and LandingRedirect picks a destination
// the current session can actually access.

const CHANNEL_NAME = 'usertour-auth-switch';

const authChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

if (authChannel) {
  authChannel.onmessage = () => {
    window.location.href = '/';
  };
}

export function broadcastAuthSwitch() {
  authChannel?.postMessage('switch');
}
