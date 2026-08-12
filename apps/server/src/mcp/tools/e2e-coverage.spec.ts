import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildReadTools } from './read-tools';
import { buildWriteTools } from './write-tools';

/**
 * E2e-coverage tripwire for the MCP tool registry — the same pattern as the
 * audit tripwire below (`write-tools.spec.ts`) and `audit-route-coverage.spec.ts`:
 * a registry the code exports, a ledger a human maintains, and a test that
 * refuses to let them drift apart.
 *
 * Every registered tool must be either COVERED (named in an e2e spec that
 * actually invokes it via tools/call) or EXEMPT (known debt). A NEW tool cannot
 * ship silently untested: it appears in the registry, matches neither list, and
 * this spec goes red until its author adds an e2e case (preferred) or an
 * explicit EXEMPT entry (visible in review, and capped — see below).
 */
const E2E_DIR = path.resolve(__dirname, '../../../test/e2e');

/**
 * Tool -> the e2e spec (relative to test/e2e/) that invokes it via tools/call.
 * The file is checked to actually name the tool, so a rename or a deleted test
 * trips here instead of rotting silently.
 */
const COVERED: Record<string, string> = {
  // openapi/mcp.e2e-spec.ts — the main MCP contract suite
  get_content_analytics: 'openapi/mcp.e2e-spec.ts',
  get_usage_overview: 'openapi/mcp.e2e-spec.ts',
  list_content: 'openapi/mcp.e2e-spec.ts',
  get_content: 'openapi/mcp.e2e-spec.ts',
  get_content_version: 'openapi/mcp.e2e-spec.ts',
  list_content_versions: 'openapi/mcp.e2e-spec.ts',
  list_publish_history: 'openapi/mcp.e2e-spec.ts',
  list_references: 'openapi/mcp.e2e-spec.ts',
  get_content_schema: 'openapi/mcp.e2e-spec.ts',
  get_authoring_guide: 'openapi/mcp.e2e-spec.ts',
  diagnose_content: 'openapi/mcp.e2e-spec.ts', // + web-socket/diagnose-content-drift.e2e-spec.ts
  diagnose_user: 'openapi/mcp.e2e-spec.ts', // + web-socket/diagnose-content-drift.e2e-spec.ts
  list_users: 'openapi/mcp.e2e-spec.ts',
  get_user: 'openapi/mcp.e2e-spec.ts',
  list_companies: 'openapi/mcp.e2e-spec.ts',
  list_segments: 'openapi/mcp.e2e-spec.ts',
  list_sessions: 'openapi/mcp.e2e-spec.ts',
  get_segment: 'openapi/mcp.e2e-spec.ts',
  upsert_user: 'openapi/mcp.e2e-spec.ts',
  upsert_company: 'openapi/mcp.e2e-spec.ts',
  add_segment_member: 'openapi/mcp.e2e-spec.ts',
  create_content: 'openapi/mcp.e2e-spec.ts',
  update_content_version: 'openapi/mcp.e2e-spec.ts',
  create_content_version: 'openapi/mcp.e2e-spec.ts',
  validate_content_version: 'openapi/mcp.e2e-spec.ts',
  publish_content: 'openapi/mcp.e2e-spec.ts',
  unpublish_content: 'openapi/mcp.e2e-spec.ts',
  duplicate_content: 'openapi/mcp.e2e-spec.ts',
  create_segment: 'openapi/mcp.e2e-spec.ts',
  create_theme: 'openapi/mcp.e2e-spec.ts',
  get_theme: 'openapi/mcp.e2e-spec.ts',
  get_theme_schema: 'openapi/mcp.e2e-spec.ts',
  list_themes: 'openapi/mcp.e2e-spec.ts',
  duplicate_theme: 'openapi/mcp.e2e-spec.ts',
  list_environments: 'openapi/mcp.e2e-spec.ts',
  get_environment: 'openapi/mcp.e2e-spec.ts',
  create_environment: 'openapi/mcp.e2e-spec.ts',
  update_environment: 'openapi/mcp.e2e-spec.ts',
  delete_environment: 'openapi/mcp.e2e-spec.ts',
  create_attribute_definition: 'openapi/mcp.e2e-spec.ts',
  // openapi/mcp-tool-contract.e2e-spec.ts — wrapper-layer contract cases
  delete_user: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_company: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_segment: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_theme: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_attribute_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_event_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_session: 'openapi/mcp-tool-contract.e2e-spec.ts',
  get_attribute_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  list_attribute_definitions: 'openapi/mcp-tool-contract.e2e-spec.ts',
  get_event_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  list_event_definitions: 'openapi/mcp-tool-contract.e2e-spec.ts',
  get_company: 'openapi/mcp-tool-contract.e2e-spec.ts',
  get_session: 'openapi/mcp-tool-contract.e2e-spec.ts',
  delete_content: 'openapi/mcp-tool-contract.e2e-spec.ts',
  restore_content: 'openapi/mcp-tool-contract.e2e-spec.ts',
  restore_content_version: 'openapi/mcp-tool-contract.e2e-spec.ts',
  update_content: 'openapi/mcp-tool-contract.e2e-spec.ts',
  update_attribute_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  update_event_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  create_event_definition: 'openapi/mcp-tool-contract.e2e-spec.ts',
  update_theme: 'openapi/mcp-tool-contract.e2e-spec.ts',
  update_segment: 'openapi/mcp-tool-contract.e2e-spec.ts',
  add_company_member: 'openapi/mcp-tool-contract.e2e-spec.ts',
  remove_company_member: 'openapi/mcp-tool-contract.e2e-spec.ts',
  remove_segment_member: 'openapi/mcp-tool-contract.e2e-spec.ts',
  end_session: 'openapi/mcp-tool-contract.e2e-spec.ts',
  // api/analytics-data.e2e-spec.ts — real-data analytics, REST + MCP off one seed
  get_content_question_analytics: 'api/analytics-data.e2e-spec.ts',
};

/**
 * Known debt: registered tools with NO e2e invocation yet. This list may only
 * SHRINK — cover a tool, move it to COVERED, and lower the cap. Raising the cap
 * to squeeze a new tool in is the one thing reviewers must refuse.
 *
 * Empty since 2026-08-05: every registered tool has an e2e invocation. A new
 * tool ships with a test, full stop.
 */
const EXEMPT_CAP = 0;
const EXEMPT = new Set<string>([]);

describe('MCP tool e2e-coverage tripwire', () => {
  const registered = [...buildReadTools(), ...buildWriteTools()].map((tool) => tool.name);

  it('every registered tool is ledgered exactly once (covered or exempt)', () => {
    expect(registered.length).toBeGreaterThan(0);
    for (const name of registered) {
      const inCovered = name in COVERED;
      const inExempt = EXEMPT.has(name);
      // Wrap so a failure names the offending tool.
      expect({ name, inCovered, inExempt }).toEqual({
        name,
        inCovered: !inExempt,
        inExempt: inExempt,
      });
    }
  });

  it('the ledger names no tool that is not registered (rename guard)', () => {
    const known = new Set(registered);
    const stale = [...Object.keys(COVERED), ...EXEMPT].filter((name) => !known.has(name));
    expect(stale).toEqual([]);
  });

  it('the exemption list only shrinks', () => {
    expect(EXEMPT.size).toBeLessThanOrEqual(EXEMPT_CAP);
  });

  it('each covering spec exists and actually names its tool', () => {
    // Read each referenced spec once; a COVERED entry whose file no longer
    // mentions the tool (renamed test, deleted case) trips here.
    const cache = new Map<string, string>();
    const text = (rel: string): string => {
      if (!cache.has(rel)) {
        cache.set(rel, fs.readFileSync(path.join(E2E_DIR, rel), 'utf8'));
      }
      return cache.get(rel) as string;
    };
    const missing = Object.entries(COVERED)
      .filter(([name, rel]) => !text(rel).includes(`'${name}'`))
      .map(([name, rel]) => `${name} not named in ${rel}`);
    expect(missing).toEqual([]);
  });
});
