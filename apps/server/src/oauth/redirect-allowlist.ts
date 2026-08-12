/**
 * Open Dynamic Client Registration (RFC 7591) is convenient but must not let an
 * attacker register an arbitrary `redirect_uri` (open-redirect / code exfil). We
 * accept only the callback shapes real MCP clients use: loopback HTTP (native /
 * CLI flows), custom app schemes, and a small allowlist of vendor web callbacks.
 * This mirrors the standard DCR redirect policy for remote OAuth servers. Human
 * consent is the second gate.
 */

// Custom-scheme native clients (Cursor, VS Code, JetBrains, …).
const ALLOWED_SCHEMES = ['cursor:', 'vscode:', 'vscode-insiders:', 'jetbrains:', 'windsurf:'];

// Vendor-hosted web callbacks (exact host, https only — a `www.` variant is a
// DIFFERENT host and needs its own entry: Cursor 3.14 registers
// `https://www.cursor.com/agents/mcp/oauth/callback`, and the bare-apex entry
// alone rejected its whole DCR request, which Cursor surfaces as an empty
// "Transient error").
const ALLOWED_HOSTS = new Set([
  'claude.ai',
  'claude.com',
  'chatgpt.com',
  'chat.openai.com',
  'cursor.com',
  'www.cursor.com',
  'vscode.dev',
]);

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** True when `uri` is an acceptable OAuth redirect target for a DCR client. */
export function isAllowedRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  // Fragments are forbidden in OAuth redirect URIs (RFC 6749 §3.1.2), and
  // userinfo has no place in a redirect target.
  if (url.hash || url.username || url.password) {
    return false;
  }
  // Native clients with a custom scheme.
  if (ALLOWED_SCHEMES.includes(url.protocol)) {
    return true;
  }
  // Loopback over http or https (RFC 8252) — any port.
  if ((url.protocol === 'http:' || url.protocol === 'https:') && LOOPBACK_HOSTS.has(url.hostname)) {
    return true;
  }
  // Known vendor web callbacks — https only, exact host.
  if (url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname)) {
    return true;
  }
  return false;
}

/**
 * Match a requested redirect_uri against the client's registered URIs. Exact
 * comparison (RFC 6749 §3.1.2.3) with two spec-mandated relaxations: an empty
 * path equals "/" (RFC 3986 §6.2.3), and loopback redirects match on any port
 * (RFC 8252 §7.3 — native clients bind a random port per run).
 */
export function matchesRegisteredRedirectUri(registered: string[], requested: string): boolean {
  let req: URL;
  try {
    req = new URL(requested);
  } catch {
    return false;
  }
  // Parsing splits fragment and userinfo out of the fields compared below, so
  // reject them explicitly — fragments are forbidden (RFC 6749 §3.1.2) and
  // userinfo would ride along on the redirect.
  if (req.hash || req.username || req.password) {
    return false;
  }
  return registered.some((entry) => {
    let reg: URL;
    try {
      reg = new URL(entry);
    } catch {
      return false;
    }
    if (
      reg.protocol !== req.protocol ||
      reg.hostname !== req.hostname ||
      normalizedPath(reg) !== normalizedPath(req) ||
      reg.search !== req.search
    ) {
      return false;
    }
    return LOOPBACK_HOSTS.has(reg.hostname) || reg.port === req.port;
  });
}

function normalizedPath(url: URL): string {
  return url.pathname === '' ? '/' : url.pathname;
}
