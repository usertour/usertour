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

// Vendor-hosted web callbacks (exact host, https only).
const ALLOWED_HOSTS = new Set([
  'claude.ai',
  'claude.com',
  'chatgpt.com',
  'chat.openai.com',
  'cursor.com',
  'vscode.dev',
]);

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** True when `uri` is an acceptable OAuth redirect target for a DCR client. */
export function isAllowedRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  // Fragments are forbidden in OAuth redirect URIs.
  if (url.hash) {
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
