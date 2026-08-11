import type { McpToolAnnotations } from '../mcp.types';

/**
 * Standard MCP tool annotation sets. Every Usertour tool operates on the
 * caller's own project data — never an unbounded external world — so
 * `openWorldHint` is always false.
 */

/** Read tools: never mutate state. */
export const READ_ONLY: McpToolAnnotations = { readOnlyHint: true, openWorldHint: false };

/** Additive write (create / duplicate): each call adds a new resource. */
const WRITE_CREATE: McpToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/** Idempotent write (update / upsert / restore / publish / add-member): re-running with the same args converges to the same state. */
const WRITE_UPDATE: McpToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** Destructive write (delete / remove / unpublish / end): removes or tears down existing data — clients should confirm first. */
const WRITE_DESTRUCTIVE: McpToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * Pick the annotation set for a write tool from its verb prefix. Unknown
 * prefixes fall back to additive create (the safe, non-destructive default).
 */
export function writeAnnotationsFor(name: string): McpToolAnnotations {
  if (/^(delete_|remove_|unpublish_|end_)/.test(name)) {
    return WRITE_DESTRUCTIVE;
  }
  if (/^(update_|upsert_|restore_|publish_|add_)/.test(name)) {
    return WRITE_UPDATE;
  }
  return WRITE_CREATE;
}
