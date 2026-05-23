/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Regenerates ./spot-check.sh from the 93-endpoint table in ../e2e/endpoints.ts.
 * Run after adding/removing/renaming an endpoint in that table:
 *
 *   pnpm smoke:spot-check-gen
 *
 * The generated shell script is purely env-driven — it embeds NO real tokens or
 * resource ids. Use `pnpm smoke:spot-check-prep` to seed a fixture and produce
 * the required SMOKE_* exports.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ENDPOINTS, type Endpoint } from '../e2e/endpoints';

// Placeholders that show up inside vars(seed)'s JSON output, mapped to the bash
// variables the generated script will use.
const A_SEED = {
  projectId: '__A_PROJECT__',
  environmentId: '__A_ENV__',
  contentId: '__A_CONTENT__',
  versionId: '__A_VERSION__',
  sessionId: '__A_SESSION__',
  themeId: '__A_THEME__',
  attributeId: '__A_ATTRIBUTE__',
  eventId: '__A_EVENT__',
  localizationId: '__A_LOCALIZATION__',
  segmentId: '__A_SEGMENT__',
  integrationId: '__A_INTEGRATION__',
  mappingId: '__A_MAPPING__',
  accessTokenId: '__A_ACCESS_TOKEN__',
  stepId: '__A_STEP__',
  bizUserId: '__A_BIZ_USER__',
  bizCompanyId: '__A_BIZ_COMPANY__',
  removableUserId: '__A_REMOVABLE_USER__',
  inviteId: '__A_INVITE__',
};
const B_SEED = {
  projectId: '__B_PROJECT__',
  environmentId: '__B_ENV__',
  contentId: '__B_CONTENT__',
  versionId: '__B_VERSION__',
  sessionId: '__B_SESSION__',
  themeId: '__B_THEME__',
  attributeId: '__B_ATTRIBUTE__',
  eventId: '__B_EVENT__',
  localizationId: '__B_LOCALIZATION__',
  segmentId: '__B_SEGMENT__',
  integrationId: '__B_INTEGRATION__',
  mappingId: '__B_MAPPING__',
  accessTokenId: '__B_ACCESS_TOKEN__',
  stepId: '__B_STEP__',
  bizUserId: '__B_BIZ_USER__',
  bizCompanyId: '__B_BIZ_COMPANY__',
  removableUserId: '__B_REMOVABLE_USER__',
  inviteId: '__B_INVITE__',
};
const SHELL_VARS: Record<string, string> = {
  __A_PROJECT__: 'SMOKE_PROJECT_ID',
  __A_ENV__: 'SMOKE_ENVIRONMENT_ID',
  __A_CONTENT__: 'SMOKE_CONTENT_ID',
  __A_VERSION__: 'SMOKE_VERSION_ID',
  __A_SESSION__: 'SMOKE_SESSION_ID',
  __A_THEME__: 'SMOKE_THEME_ID',
  __A_ATTRIBUTE__: 'SMOKE_ATTRIBUTE_ID',
  __A_EVENT__: 'SMOKE_EVENT_ID',
  __A_LOCALIZATION__: 'SMOKE_LOCALIZATION_ID',
  __A_SEGMENT__: 'SMOKE_SEGMENT_ID',
  __A_INTEGRATION__: 'SMOKE_INTEGRATION_ID',
  __A_MAPPING__: 'SMOKE_MAPPING_ID',
  __A_ACCESS_TOKEN__: 'SMOKE_ACCESS_TOKEN_ID',
  __A_STEP__: 'SMOKE_STEP_ID',
  __A_BIZ_USER__: 'SMOKE_BIZ_USER_ID',
  __A_BIZ_COMPANY__: 'SMOKE_BIZ_COMPANY_ID',
  __A_REMOVABLE_USER__: 'SMOKE_REMOVABLE_USER_ID',
  __A_INVITE__: 'SMOKE_INVITE_ID',
  __B_PROJECT__: 'SMOKE_B_PROJECT_ID',
  __B_ENV__: 'SMOKE_B_ENVIRONMENT_ID',
  __B_CONTENT__: 'SMOKE_B_CONTENT_ID',
  __B_VERSION__: 'SMOKE_B_VERSION_ID',
  __B_SESSION__: 'SMOKE_B_SESSION_ID',
  __B_THEME__: 'SMOKE_B_THEME_ID',
  __B_ATTRIBUTE__: 'SMOKE_B_ATTRIBUTE_ID',
  __B_EVENT__: 'SMOKE_B_EVENT_ID',
  __B_LOCALIZATION__: 'SMOKE_B_LOCALIZATION_ID',
  __B_SEGMENT__: 'SMOKE_B_SEGMENT_ID',
  __B_INTEGRATION__: 'SMOKE_B_INTEGRATION_ID',
  __B_MAPPING__: 'SMOKE_B_MAPPING_ID',
  __B_ACCESS_TOKEN__: 'SMOKE_B_ACCESS_TOKEN_ID',
  __B_STEP__: 'SMOKE_B_STEP_ID',
  __B_BIZ_USER__: 'SMOKE_B_BIZ_USER_ID',
  __B_BIZ_COMPANY__: 'SMOKE_B_BIZ_COMPANY_ID',
  __B_REMOVABLE_USER__: 'SMOKE_B_REMOVABLE_USER_ID',
  __B_INVITE__: 'SMOKE_B_INVITE_ID',
};

function bashBody(ep: Endpoint, seed: any): string {
  const json = JSON.stringify({ query: ep.doc, variables: ep.vars(seed) });
  let s = json;
  for (const [ph, varName] of Object.entries(SHELL_VARS)) {
    s = s.split(ph).join(`\${${varName}}`);
  }
  // Escape GraphQL $vars (single-letter, no curly braces) from bash expansion.
  // After the loop above, all bash refs use ${...}, so $X with X != { is GQL.
  s = s.replace(/\$(?!\{)/g, '\\$');
  // Escape double quotes for embedding in a bash double-quoted string.
  s = s.replace(/"/g, '\\"');
  return `"${s}"`;
}

const groups = {
  R_query: ENDPOINTS.filter((e) => e.tier === 'R' && e.op === 'query'),
  R_mut: ENDPOINTS.filter((e) => e.tier === 'R' && e.op === 'mutation'),
  W_mut: ENDPOINTS.filter((e) => e.tier === 'W' && e.op === 'mutation'),
  O_query: ENDPOINTS.filter((e) => e.tier === 'O' && e.op === 'query'),
  O_mut: ENDPOINTS.filter((e) => e.tier === 'O' && e.op === 'mutation'),
};
const allQueries = [...groups.R_query, ...groups.O_query];
const allMutations = [...groups.R_mut, ...groups.W_mut, ...groups.O_mut];

const REQUIRED_ENV = [
  'SMOKE_URL',
  ...Object.values(SHELL_VARS),
  'SMOKE_TOKEN_OWNER',
  'SMOKE_TOKEN_ADMIN',
  'SMOKE_TOKEN_VIEWER',
  'SMOKE_TOKEN_ELSEWHERE',
];

const out: string[] = [];
const p = (s = '') => out.push(s);

p('#!/usr/bin/env bash');
p('# Manual diagnostic tool — fires curl against every role-gated GraphQL');
p('# endpoint as 4 roles + cross-project IDOR, prints labeled results.');
p('#');
p('# GENERATED from ../e2e/endpoints.ts via gen-spot-check.ts — do NOT hand-edit.');
p('#');
p('# This is a diagnostic tool, NOT a regression test. For automated assertion,');
p('# see permission.e2e-spec.ts (jest e2e, runs in seconds, fails CI cleanly).');
p("# This script's value is human-eye verification and copy-pasteable curls.");
p('#');
p('# Quick start:');
p(
  '#   eval "$(pnpm --silent smoke:spot-check-prep)"   # seed fixture in DATABASE_URL DB + mint tokens',
);
p('#   pnpm smoke:spot-check --queries-only   # safe read-only sweep');
p('#   pnpm smoke:spot-check                  # full sweep, prompts before mutations');
p('#   pnpm smoke:spot-check-teardown         # delete the fixture');
p('#');
p('# Flags:');
p('#   --queries-only     only the read sections (zero side effects)');
p('#   --no-prompt        run mutations without confirmation (destructive)');
p('#   --show-curl        print each curl command (paste-able)');
p('#');
p('# Expected pattern (any deviation that is not a placeholder-id artifact or');
p('# a post-guard typed BaseError is a real problem):');
p('#   In-project R: OWNER/ADMIN/VIEWER OK,  ELSEWHERE E0013');
p('#   In-project W: OWNER/ADMIN OK,         VIEWER/ELSEWHERE E0013');
p('#   In-project O: OWNER OK,               ADMIN/VIEWER/ELSEWHERE E0013');
p('#   Cross-project (A→B and B→A): both E0013 for every endpoint');
p('');
p('set -u');
p('');
p('# ── env validation ────────────────────────────────────────────');
p(`REQUIRED=(${REQUIRED_ENV.join(' ')})`);
p('missing=()');
p('for v in "${REQUIRED[@]}"; do');
p('  if [ -z "${!v:-}" ]; then missing+=("$v"); fi');
p('done');
p('if [ ${#missing[@]} -gt 0 ]; then');
p('  echo "Missing required env vars (run \\`pnpm smoke:spot-check-prep\\` first):" >&2');
p('  for v in "${missing[@]}"; do echo "  $v" >&2; done');
p('  exit 2');
p('fi');
p('');
p('# ── flags ─────────────────────────────────────────────────────');
p('QUERIES_ONLY=0; NO_PROMPT=0; SHOW_CURL=0');
p('for arg in "$@"; do');
p('  case "$arg" in');
p('    --queries-only) QUERIES_ONLY=1 ;;');
p('    --no-prompt) NO_PROMPT=1 ;;');
p('    --show-curl|--curl) SHOW_CURL=1 ;;');
p('  esac');
p('done');
p('');
p('# ── helpers ───────────────────────────────────────────────────');
p('hit() {');
p('  local role="$1" label="$2" body="$3"');
p('  local token_var="SMOKE_TOKEN_$role"');
p('  local token="${!token_var}"');
p('  if [ "$SHOW_CURL" -eq 1 ]; then');
p(
  "    printf \"    \\033[2m$ curl -sS -X POST '%s' -H 'Content-Type: application/json' -H 'Authorization: Bearer %s' -d '%s'\\033[0m\\n\" \\",
);
p('      "$SMOKE_URL" "$token" "$body"');
p('  fi');
p(
  '  local resp=$(curl -sS -X POST "$SMOKE_URL" -H \'Content-Type: application/json\' -H "Authorization: Bearer $token" -d "$body")',
);
p('  local code');
p('  if command -v jq >/dev/null 2>&1; then');
p(
  '    code=$(printf \'%s\' "$resp" | jq -r \'(.errors[0]?.extensions.code) // "OK"\' 2>/dev/null)',
);
p('  else');
p('    if echo "$resp" | grep -q \'"E0013"\'; then code=E0013');
p('    elif echo "$resp" | grep -q \'"errors"\'; then code=OTHER_ERROR');
p('    else code=OK; fi');
p('  fi');
p('  printf \'  [%-9s] %-44s → %s\\n\' "$role" "$label" "$code"');
p('}');
p('');
p('section() { printf \'\\n\\033[1m=== %s ===\\033[0m\\n\' "$1"; }');
p('');
p('run_endpoint() {');
p('  local label="$1" body="$2"');
p('  for r in OWNER ADMIN VIEWER ELSEWHERE; do hit "$r" "$label" "$body"; done');
p('}');
p('');
p('mutual() {');
p('  local label="$1" body_b="$2" body_a="$3"');
p('  hit OWNER     "$label  [A→B]" "$body_b"');
p('  hit ELSEWHERE "$label  [B→A]" "$body_a"');
p('}');
p('');

// Section 1 — R queries in-project
p(`section "R-tier QUERIES — in-project (${groups.R_query.length} endpoints, safe)"`);
for (const ep of groups.R_query) {
  p(`run_endpoint '${ep.key}' \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

// Section 2 — O queries in-project
p(`section "O-tier QUERIES — in-project (${groups.O_query.length} endpoints, safe)"`);
for (const ep of groups.O_query) {
  p(`run_endpoint '${ep.key}' \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

// Section 3 — cross-project queries (mutual)
p(`section "Cross-project mutual QUERIES (${allQueries.length} endpoints × 2 directions, safe)"`);
for (const ep of allQueries) {
  p(`mutual '${ep.key}' \\`);
  p(`  ${bashBody(ep, B_SEED)} \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

// queries-only gate
p(
  'if [ "$QUERIES_ONLY" -eq 1 ]; then echo; echo "(--queries-only set; skipping mutations)"; exit 0; fi',
);
p('');
p('echo');
p('echo "─────────────────────────────────────────────────────────────"');
p('echo " The mutations below WILL EXECUTE on project $SMOKE_PROJECT_ID for any role"');
p('echo " that has permission. Side effects include deletes, renames, invites,"');
p('echo " segment creation, content publish/unpublish — this trashes the project\'s"');
p('echo " fixtures. Use a dedicated smoke-fixture-* project (from prep), not real data."');
p('echo "─────────────────────────────────────────────────────────────"');
p('if [ "$NO_PROMPT" -ne 1 ]; then');
p('  read -r -p "Proceed with mutations? [y/N] " ans');
p('  [ "$ans" = "y" ] || { echo "stopped before mutations."; exit 0; }');
p('fi');
p('');

// Section 4 — R mutation in-project
p(`section "R-tier MUTATION — in-project (${groups.R_mut.length} endpoint)"`);
for (const ep of groups.R_mut) {
  p(`run_endpoint '${ep.key}' \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

// Section 5 — W mutations in-project
p(`section "W-tier MUTATIONS — in-project (${groups.W_mut.length} endpoints, DESTRUCTIVE)"`);
for (const ep of groups.W_mut) {
  p(`run_endpoint '${ep.key}' \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

// Section 6 — O mutations in-project
p(`section "O-tier MUTATIONS — in-project (${groups.O_mut.length} endpoints, DESTRUCTIVE)"`);
for (const ep of groups.O_mut) {
  p(`run_endpoint '${ep.key}' \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

// Section 7 — cross-project mutations (mutual)
p(`section "Cross-project mutual MUTATIONS (${allMutations.length} endpoints × 2 directions)"`);
p('# If guard works, all of these return E0013 with zero side effects.');
p('# If guard is broken (IDOR), A→B mutations EXECUTE on B — verify guard before running.');
for (const ep of allMutations) {
  p(`mutual '${ep.key}' \\`);
  p(`  ${bashBody(ep, B_SEED)} \\`);
  p(`  ${bashBody(ep, A_SEED)}`);
  p('');
}

const outPath = resolve(__dirname, 'spot-check.sh');
writeFileSync(outPath, out.join('\n'));
console.error(`wrote ${outPath} (${out.length} lines, ${ENDPOINTS.length} endpoints)`);
