#!/usr/bin/env bash
# Manual diagnostic tool — fires curl against every role-gated GraphQL
# endpoint as 4 roles + cross-project IDOR, prints labeled results.
#
# GENERATED from ../e2e/endpoints.ts via gen-spot-check.ts — do NOT hand-edit.
#
# This is a diagnostic tool, NOT a regression test. For automated assertion,
# see permission.e2e-spec.ts (jest e2e, runs in seconds, fails CI cleanly).
# This script's value is human-eye verification and copy-pasteable curls.
#
# Quick start:
#   eval "$(pnpm --silent smoke:spot-check-prep)"   # seed fixture in DATABASE_URL DB + mint tokens
#   pnpm smoke:spot-check --queries-only   # safe read-only sweep
#   pnpm smoke:spot-check                  # full sweep, prompts before mutations
#   pnpm smoke:spot-check-teardown         # delete the fixture
#
# Flags:
#   --queries-only     only the read sections (zero side effects)
#   --no-prompt        run mutations without confirmation (destructive)
#   --show-curl        print each curl command (paste-able)
#
# Expected pattern (any deviation that is not a placeholder-id artifact or
# a post-guard typed BaseError is a real problem):
#   In-project R: OWNER/ADMIN/VIEWER OK,  ELSEWHERE E0013
#   In-project W: OWNER/ADMIN OK,         VIEWER/ELSEWHERE E0013
#   In-project O: OWNER OK,               ADMIN/VIEWER/ELSEWHERE E0013
#   Cross-project (A→B and B→A): both E0013 for every endpoint

set -u

# ── env validation ────────────────────────────────────────────
REQUIRED=(SMOKE_URL SMOKE_PROJECT_ID SMOKE_ENVIRONMENT_ID SMOKE_ENVIRONMENT_FOR_OWNER_DELETE_ID SMOKE_ENVIRONMENT_FOR_ADMIN_DELETE_ID SMOKE_CONTENT_ID SMOKE_VERSION_ID SMOKE_SESSION_ID SMOKE_SESSION_FOR_OWNER_DELETE_ID SMOKE_SESSION_FOR_ADMIN_DELETE_ID SMOKE_SESSION_FOR_OWNER_END_ID SMOKE_SESSION_FOR_ADMIN_END_ID SMOKE_THEME_ID SMOKE_THEME_FOR_OWNER_DELETE_ID SMOKE_THEME_FOR_ADMIN_DELETE_ID SMOKE_ATTRIBUTE_ID SMOKE_ATTRIBUTE_FOR_OWNER_DELETE_ID SMOKE_ATTRIBUTE_FOR_ADMIN_DELETE_ID SMOKE_EVENT_ID SMOKE_EVENT_FOR_OWNER_DELETE_ID SMOKE_EVENT_FOR_ADMIN_DELETE_ID SMOKE_LOCALIZATION_ID SMOKE_LOCALIZATION_FOR_OWNER_DELETE_ID SMOKE_LOCALIZATION_FOR_ADMIN_DELETE_ID SMOKE_SEGMENT_ID SMOKE_SEGMENT_FOR_OWNER_DELETE_ID SMOKE_SEGMENT_FOR_ADMIN_DELETE_ID SMOKE_INTEGRATION_ID SMOKE_MAPPING_ID SMOKE_ACCESS_TOKEN_ID SMOKE_STEP_ID SMOKE_BIZ_USER_ID SMOKE_BIZ_USER_FOR_OWNER_DELETE_ID SMOKE_BIZ_USER_FOR_ADMIN_DELETE_ID SMOKE_BIZ_COMPANY_ID SMOKE_BIZ_COMPANY_FOR_OWNER_DELETE_ID SMOKE_BIZ_COMPANY_FOR_ADMIN_DELETE_ID SMOKE_REMOVABLE_USER_ID SMOKE_REMOVABLE_USER_FOR_CHANGE_ROLE_ID SMOKE_INVITE_ID SMOKE_B_PROJECT_ID SMOKE_B_ENVIRONMENT_ID SMOKE_B_ENVIRONMENT_FOR_OWNER_DELETE_ID SMOKE_B_ENVIRONMENT_FOR_ADMIN_DELETE_ID SMOKE_B_CONTENT_ID SMOKE_B_VERSION_ID SMOKE_B_SESSION_ID SMOKE_B_SESSION_FOR_OWNER_DELETE_ID SMOKE_B_SESSION_FOR_ADMIN_DELETE_ID SMOKE_B_SESSION_FOR_OWNER_END_ID SMOKE_B_SESSION_FOR_ADMIN_END_ID SMOKE_B_THEME_ID SMOKE_B_THEME_FOR_OWNER_DELETE_ID SMOKE_B_THEME_FOR_ADMIN_DELETE_ID SMOKE_B_ATTRIBUTE_ID SMOKE_B_ATTRIBUTE_FOR_OWNER_DELETE_ID SMOKE_B_ATTRIBUTE_FOR_ADMIN_DELETE_ID SMOKE_B_EVENT_ID SMOKE_B_EVENT_FOR_OWNER_DELETE_ID SMOKE_B_EVENT_FOR_ADMIN_DELETE_ID SMOKE_B_LOCALIZATION_ID SMOKE_B_LOCALIZATION_FOR_OWNER_DELETE_ID SMOKE_B_LOCALIZATION_FOR_ADMIN_DELETE_ID SMOKE_B_SEGMENT_ID SMOKE_B_SEGMENT_FOR_OWNER_DELETE_ID SMOKE_B_SEGMENT_FOR_ADMIN_DELETE_ID SMOKE_B_INTEGRATION_ID SMOKE_B_MAPPING_ID SMOKE_B_ACCESS_TOKEN_ID SMOKE_B_STEP_ID SMOKE_B_BIZ_USER_ID SMOKE_B_BIZ_USER_FOR_OWNER_DELETE_ID SMOKE_B_BIZ_USER_FOR_ADMIN_DELETE_ID SMOKE_B_BIZ_COMPANY_ID SMOKE_B_BIZ_COMPANY_FOR_OWNER_DELETE_ID SMOKE_B_BIZ_COMPANY_FOR_ADMIN_DELETE_ID SMOKE_B_REMOVABLE_USER_ID SMOKE_B_REMOVABLE_USER_FOR_CHANGE_ROLE_ID SMOKE_B_INVITE_ID SMOKE_TOKEN_OWNER SMOKE_TOKEN_ADMIN SMOKE_TOKEN_VIEWER SMOKE_TOKEN_ELSEWHERE)
missing=()
for v in "${REQUIRED[@]}"; do
  if [ -z "${!v:-}" ]; then missing+=("$v"); fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required env vars (run \`pnpm smoke:spot-check-prep\` first):" >&2
  for v in "${missing[@]}"; do echo "  $v" >&2; done
  exit 2
fi

# ── flags ─────────────────────────────────────────────────────
QUERIES_ONLY=0; NO_PROMPT=0; SHOW_CURL=0
for arg in "$@"; do
  case "$arg" in
    --queries-only) QUERIES_ONLY=1 ;;
    --no-prompt) NO_PROMPT=1 ;;
    --show-curl|--curl) SHOW_CURL=1 ;;
  esac
done

# ── helpers ───────────────────────────────────────────────────
hit() {
  local role="$1" label="$2" body="$3"
  local token_var="SMOKE_TOKEN_$role"
  local token="${!token_var}"
  if [ "$SHOW_CURL" -eq 1 ]; then
    printf "    \033[2m$ curl -sS -X POST '%s' -H 'Content-Type: application/json' -H 'Authorization: Bearer %s' -d '%s'\033[0m\n" \
      "$SMOKE_URL" "$token" "$body"
  fi
  local resp=$(curl -sS -X POST "$SMOKE_URL" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d "$body")
  local code
  if command -v jq >/dev/null 2>&1; then
    code=$(printf '%s' "$resp" | jq -r '(.errors[0]?.extensions.code) // "OK"' 2>/dev/null)
  else
    if echo "$resp" | grep -q '"E0013"'; then code=E0013
    elif echo "$resp" | grep -q '"errors"'; then code=OTHER_ERROR
    else code=OK; fi
  fi
  printf '  [%-9s] %-44s → %s\n' "$role" "$label" "$code"
}

section() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

run_endpoint() {
  local label="$1" body="$2"
  for r in OWNER ADMIN VIEWER ELSEWHERE; do hit "$r" "$label" "$body"; done
}

# Same-shape as run_endpoint but takes 4 separate bodies — used by
# destructive mutations whose vars pick a per-role target id (so OWNER and
# ADMIN don't fight over the same row). See gen-spot-check.ts emitInProjectRow.
run_endpoint_per_role() {
  local label="$1" o="$2" a="$3" v="$4" e="$5"
  hit OWNER     "$label" "$o"
  hit ADMIN     "$label" "$a"
  hit VIEWER    "$label" "$v"
  hit ELSEWHERE "$label" "$e"
}

mutual() {
  local label="$1" body_b="$2" body_a="$3"
  hit OWNER     "$label  [A→B]" "$body_b"
  hit ELSEWHERE "$label  [B→A]" "$body_a"
}

section "R-tier QUERIES — in-project (26 endpoints, safe)"
run_endpoint 'projects.getProjectConfig' \
  "{\"query\":\"query(\$p:String!){getProjectConfig(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'content.getContent' \
  "{\"query\":\"query(\$c:String!){getContent(contentId:\$c){__typename}}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\"}}"

run_endpoint 'content.getContentVersion' \
  "{\"query\":\"query(\$v:String!){getContentVersion(versionId:\$v){__typename}}\",\"variables\":{\"v\":\"${SMOKE_VERSION_ID}\"}}"

run_endpoint 'content.listContentVersions' \
  "{\"query\":\"query(\$c:String!){listContentVersions(contentId:\$c){__typename}}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\"}}"

run_endpoint 'content.findManyVersionLocations' \
  "{\"query\":\"query(\$v:String!){findManyVersionLocations(versionId:\$v){__typename}}\",\"variables\":{\"v\":\"${SMOKE_VERSION_ID}\"}}"

run_endpoint 'content.queryContent' \
  "{\"query\":\"query(\$q:ContentQuery){queryContent(query:\$q){__typename}}\",\"variables\":{\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'environments.userEnvironments' \
  "{\"query\":\"query(\$p:String!){userEnvironments(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'biz.queryBizUser' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizQuery!){queryBizUser(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'biz.queryBizCompany' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizQuery!){queryBizCompany(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'biz.queryBizUserEvents' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizEventQuery!){queryBizUserEvents(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'biz.queryBizCompanyEvents' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizEventQuery!){queryBizCompanyEvents(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'biz.listSegment' \
  "{\"query\":\"query(\$e:String){listSegment(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

run_endpoint 'localizations.listLocalizations' \
  "{\"query\":\"query(\$p:String!){listLocalizations(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'attributes.listAttributes' \
  "{\"query\":\"query(\$b:Int!,\$p:String!){listAttributes(bizType:\$b,projectId:\$p){__typename}}\",\"variables\":{\"b\":1,\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'themes.getTheme' \
  "{\"query\":\"query(\$t:String!){getTheme(themeId:\$t){__typename}}\",\"variables\":{\"t\":\"${SMOKE_THEME_ID}\"}}"

run_endpoint 'themes.listThemes' \
  "{\"query\":\"query(\$p:String!){listThemes(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'events.listEvents' \
  "{\"query\":\"query(\$p:String!){listEvents(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'events.listAttributeOnEvents' \
  "{\"query\":\"query(\$e:String!){listAttributeOnEvents(eventId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_EVENT_ID}\"}}"

run_endpoint 'analytics.queryContentAnalytics' \
  "{\"query\":\"query(\$c:String!,\$ed:String!,\$ev:String!,\$sd:String!,\$tz:String!){queryContentAnalytics(contentId:\$c,endDate:\$ed,environmentId:\$ev,startDate:\$sd,timezone:\$tz){__typename}}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\",\"ed\":\"2020-01-31\",\"ev\":\"${SMOKE_ENVIRONMENT_ID}\",\"sd\":\"2020-01-01\",\"tz\":\"UTC\"}}"

run_endpoint 'analytics.queryContentQuestionAnalytics' \
  "{\"query\":\"query(\$c:String!,\$ed:String!,\$ev:String!,\$sd:String!,\$tz:String!){queryContentQuestionAnalytics(contentId:\$c,endDate:\$ed,environmentId:\$ev,startDate:\$sd,timezone:\$tz)}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\",\"ed\":\"2020-01-31\",\"ev\":\"${SMOKE_ENVIRONMENT_ID}\",\"sd\":\"2020-01-01\",\"tz\":\"UTC\"}}"

run_endpoint 'analytics.queryBizSession' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){queryBizSession(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}"

run_endpoint 'analytics.querySessionDetail' \
  "{\"query\":\"query(\$s:String!){querySessionDetail(sessionId:\$s){__typename}}\",\"variables\":{\"s\":\"${SMOKE_SESSION_ID}\"}}"

run_endpoint 'analytics.listSessionsDetail' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){listSessionsDetail(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}"

run_endpoint 'analytics.querySessionsByExternalId' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:SessionQuery!){querySessionsByExternalId(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'analytics.queryTooltipTargetMissingSessions' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:TooltipTargetMissingQuery!){queryTooltipTargetMissingSessions(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"stepCvid\":\"e2e\",\"timezone\":\"UTC\"}}}"

run_endpoint 'analytics.queryTrackerUsers' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){queryTrackerUsers(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}"

section "O-tier QUERIES — in-project (11 endpoints, safe)"
run_endpoint 'projects.getProjectLicenseInfo' \
  "{\"query\":\"query(\$p:String!){getProjectLicenseInfo(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'environments.listAccessTokens' \
  "{\"query\":\"query(\$e:String!){listAccessTokens(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

run_endpoint 'environments.getAccessToken' \
  "{\"query\":\"query(\$a:String!,\$e:String!){getAccessToken(accessTokenId:\$a,environmentId:\$e)}\",\"variables\":{\"a\":\"${SMOKE_ACCESS_TOKEN_ID}\",\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

run_endpoint 'integration.listIntegrations' \
  "{\"query\":\"query(\$e:String!){listIntegrations(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

run_endpoint 'integration.getIntegration' \
  "{\"query\":\"query(\$e:String!,\$p:String!){getIntegration(environmentId:\$e,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}"

run_endpoint 'integration.getSalesforceAuthUrl' \
  "{\"query\":\"query(\$e:String!,\$p:String!){getSalesforceAuthUrl(environmentId:\$e,provider:\$p)}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}"

run_endpoint 'integration.getSalesforceObjectFields' \
  "{\"query\":\"query(\$i:String!){getSalesforceObjectFields(integrationId:\$i){__typename}}\",\"variables\":{\"i\":\"${SMOKE_INTEGRATION_ID}\"}}"

run_endpoint 'integration.getIntegrationObjectMappings' \
  "{\"query\":\"query(\$i:String!){getIntegrationObjectMappings(integrationId:\$i){__typename}}\",\"variables\":{\"i\":\"${SMOKE_INTEGRATION_ID}\"}}"

run_endpoint 'integration.getIntegrationObjectMapping' \
  "{\"query\":\"query(\$id:String!){getIntegrationObjectMapping(id:\$id){__typename}}\",\"variables\":{\"id\":\"${SMOKE_MAPPING_ID}\"}}"

run_endpoint 'team.getInvites' \
  "{\"query\":\"query(\$p:String!){getInvites(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'team.getTeamMembers' \
  "{\"query\":\"query(\$p:String!){getTeamMembers(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

section "Cross-project mutual QUERIES (37 endpoints × 2 directions, safe)"
mutual 'projects.getProjectConfig' \
  "{\"query\":\"query(\$p:String!){getProjectConfig(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){getProjectConfig(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'content.getContent' \
  "{\"query\":\"query(\$c:String!){getContent(contentId:\$c){__typename}}\",\"variables\":{\"c\":\"${SMOKE_B_CONTENT_ID}\"}}" \
  "{\"query\":\"query(\$c:String!){getContent(contentId:\$c){__typename}}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\"}}"

mutual 'content.getContentVersion' \
  "{\"query\":\"query(\$v:String!){getContentVersion(versionId:\$v){__typename}}\",\"variables\":{\"v\":\"${SMOKE_B_VERSION_ID}\"}}" \
  "{\"query\":\"query(\$v:String!){getContentVersion(versionId:\$v){__typename}}\",\"variables\":{\"v\":\"${SMOKE_VERSION_ID}\"}}"

mutual 'content.listContentVersions' \
  "{\"query\":\"query(\$c:String!){listContentVersions(contentId:\$c){__typename}}\",\"variables\":{\"c\":\"${SMOKE_B_CONTENT_ID}\"}}" \
  "{\"query\":\"query(\$c:String!){listContentVersions(contentId:\$c){__typename}}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\"}}"

mutual 'content.findManyVersionLocations' \
  "{\"query\":\"query(\$v:String!){findManyVersionLocations(versionId:\$v){__typename}}\",\"variables\":{\"v\":\"${SMOKE_B_VERSION_ID}\"}}" \
  "{\"query\":\"query(\$v:String!){findManyVersionLocations(versionId:\$v){__typename}}\",\"variables\":{\"v\":\"${SMOKE_VERSION_ID}\"}}"

mutual 'content.queryContent' \
  "{\"query\":\"query(\$q:ContentQuery){queryContent(query:\$q){__typename}}\",\"variables\":{\"q\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"query(\$q:ContentQuery){queryContent(query:\$q){__typename}}\",\"variables\":{\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'environments.userEnvironments' \
  "{\"query\":\"query(\$p:String!){userEnvironments(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){userEnvironments(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'biz.queryBizUser' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizQuery!){queryBizUser(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizQuery!){queryBizUser(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'biz.queryBizCompany' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizQuery!){queryBizCompany(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizQuery!){queryBizCompany(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'biz.queryBizUserEvents' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizEventQuery!){queryBizUserEvents(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizEventQuery!){queryBizUserEvents(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'biz.queryBizCompanyEvents' \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizEventQuery!){queryBizCompanyEvents(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"query(\$o:BizOrder!,\$q:BizEventQuery!){queryBizCompanyEvents(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'biz.listSegment' \
  "{\"query\":\"query(\$e:String){listSegment(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}" \
  "{\"query\":\"query(\$e:String){listSegment(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

mutual 'localizations.listLocalizations' \
  "{\"query\":\"query(\$p:String!){listLocalizations(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){listLocalizations(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'attributes.listAttributes' \
  "{\"query\":\"query(\$b:Int!,\$p:String!){listAttributes(bizType:\$b,projectId:\$p){__typename}}\",\"variables\":{\"b\":1,\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$b:Int!,\$p:String!){listAttributes(bizType:\$b,projectId:\$p){__typename}}\",\"variables\":{\"b\":1,\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'themes.getTheme' \
  "{\"query\":\"query(\$t:String!){getTheme(themeId:\$t){__typename}}\",\"variables\":{\"t\":\"${SMOKE_B_THEME_ID}\"}}" \
  "{\"query\":\"query(\$t:String!){getTheme(themeId:\$t){__typename}}\",\"variables\":{\"t\":\"${SMOKE_THEME_ID}\"}}"

mutual 'themes.listThemes' \
  "{\"query\":\"query(\$p:String!){listThemes(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){listThemes(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'events.listEvents' \
  "{\"query\":\"query(\$p:String!){listEvents(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){listEvents(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'events.listAttributeOnEvents' \
  "{\"query\":\"query(\$e:String!){listAttributeOnEvents(eventId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_EVENT_ID}\"}}" \
  "{\"query\":\"query(\$e:String!){listAttributeOnEvents(eventId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_EVENT_ID}\"}}"

mutual 'analytics.queryContentAnalytics' \
  "{\"query\":\"query(\$c:String!,\$ed:String!,\$ev:String!,\$sd:String!,\$tz:String!){queryContentAnalytics(contentId:\$c,endDate:\$ed,environmentId:\$ev,startDate:\$sd,timezone:\$tz){__typename}}\",\"variables\":{\"c\":\"${SMOKE_B_CONTENT_ID}\",\"ed\":\"2020-01-31\",\"ev\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"sd\":\"2020-01-01\",\"tz\":\"UTC\"}}" \
  "{\"query\":\"query(\$c:String!,\$ed:String!,\$ev:String!,\$sd:String!,\$tz:String!){queryContentAnalytics(contentId:\$c,endDate:\$ed,environmentId:\$ev,startDate:\$sd,timezone:\$tz){__typename}}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\",\"ed\":\"2020-01-31\",\"ev\":\"${SMOKE_ENVIRONMENT_ID}\",\"sd\":\"2020-01-01\",\"tz\":\"UTC\"}}"

mutual 'analytics.queryContentQuestionAnalytics' \
  "{\"query\":\"query(\$c:String!,\$ed:String!,\$ev:String!,\$sd:String!,\$tz:String!){queryContentQuestionAnalytics(contentId:\$c,endDate:\$ed,environmentId:\$ev,startDate:\$sd,timezone:\$tz)}\",\"variables\":{\"c\":\"${SMOKE_B_CONTENT_ID}\",\"ed\":\"2020-01-31\",\"ev\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"sd\":\"2020-01-01\",\"tz\":\"UTC\"}}" \
  "{\"query\":\"query(\$c:String!,\$ed:String!,\$ev:String!,\$sd:String!,\$tz:String!){queryContentQuestionAnalytics(contentId:\$c,endDate:\$ed,environmentId:\$ev,startDate:\$sd,timezone:\$tz)}\",\"variables\":{\"c\":\"${SMOKE_CONTENT_ID}\",\"ed\":\"2020-01-31\",\"ev\":\"${SMOKE_ENVIRONMENT_ID}\",\"sd\":\"2020-01-01\",\"tz\":\"UTC\"}}"

mutual 'analytics.queryBizSession' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){queryBizSession(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}" \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){queryBizSession(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}"

mutual 'analytics.querySessionDetail' \
  "{\"query\":\"query(\$s:String!){querySessionDetail(sessionId:\$s){__typename}}\",\"variables\":{\"s\":\"${SMOKE_B_SESSION_ID}\"}}" \
  "{\"query\":\"query(\$s:String!){querySessionDetail(sessionId:\$s){__typename}}\",\"variables\":{\"s\":\"${SMOKE_SESSION_ID}\"}}"

mutual 'analytics.listSessionsDetail' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){listSessionsDetail(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}" \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){listSessionsDetail(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}"

mutual 'analytics.querySessionsByExternalId' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:SessionQuery!){querySessionsByExternalId(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:SessionQuery!){querySessionsByExternalId(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'analytics.queryTooltipTargetMissingSessions' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:TooltipTargetMissingQuery!){queryTooltipTargetMissingSessions(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"stepCvid\":\"e2e\",\"timezone\":\"UTC\"}}}" \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:TooltipTargetMissingQuery!){queryTooltipTargetMissingSessions(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"stepCvid\":\"e2e\",\"timezone\":\"UTC\"}}}"

mutual 'analytics.queryTrackerUsers' \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){queryTrackerUsers(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}" \
  "{\"query\":\"query(\$o:AnalyticsOrder!,\$q:AnalyticsQuery!){queryTrackerUsers(orderBy:\$o,query:\$q){__typename}}\",\"variables\":{\"o\":{\"direction\":\"asc\",\"field\":\"createdAt\"},\"q\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"endDate\":\"2020-01-31\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"startDate\":\"2020-01-01\",\"timezone\":\"UTC\"}}}"

mutual 'projects.getProjectLicenseInfo' \
  "{\"query\":\"query(\$p:String!){getProjectLicenseInfo(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){getProjectLicenseInfo(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'environments.listAccessTokens' \
  "{\"query\":\"query(\$e:String!){listAccessTokens(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}" \
  "{\"query\":\"query(\$e:String!){listAccessTokens(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

mutual 'environments.getAccessToken' \
  "{\"query\":\"query(\$a:String!,\$e:String!){getAccessToken(accessTokenId:\$a,environmentId:\$e)}\",\"variables\":{\"a\":\"${SMOKE_B_ACCESS_TOKEN_ID}\",\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}" \
  "{\"query\":\"query(\$a:String!,\$e:String!){getAccessToken(accessTokenId:\$a,environmentId:\$e)}\",\"variables\":{\"a\":\"${SMOKE_ACCESS_TOKEN_ID}\",\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

mutual 'integration.listIntegrations' \
  "{\"query\":\"query(\$e:String!){listIntegrations(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}" \
  "{\"query\":\"query(\$e:String!){listIntegrations(environmentId:\$e){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

mutual 'integration.getIntegration' \
  "{\"query\":\"query(\$e:String!,\$p:String!){getIntegration(environmentId:\$e,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}" \
  "{\"query\":\"query(\$e:String!,\$p:String!){getIntegration(environmentId:\$e,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}"

mutual 'integration.getSalesforceAuthUrl' \
  "{\"query\":\"query(\$e:String!,\$p:String!){getSalesforceAuthUrl(environmentId:\$e,provider:\$p)}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}" \
  "{\"query\":\"query(\$e:String!,\$p:String!){getSalesforceAuthUrl(environmentId:\$e,provider:\$p)}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}"

mutual 'integration.getSalesforceObjectFields' \
  "{\"query\":\"query(\$i:String!){getSalesforceObjectFields(integrationId:\$i){__typename}}\",\"variables\":{\"i\":\"${SMOKE_B_INTEGRATION_ID}\"}}" \
  "{\"query\":\"query(\$i:String!){getSalesforceObjectFields(integrationId:\$i){__typename}}\",\"variables\":{\"i\":\"${SMOKE_INTEGRATION_ID}\"}}"

mutual 'integration.getIntegrationObjectMappings' \
  "{\"query\":\"query(\$i:String!){getIntegrationObjectMappings(integrationId:\$i){__typename}}\",\"variables\":{\"i\":\"${SMOKE_B_INTEGRATION_ID}\"}}" \
  "{\"query\":\"query(\$i:String!){getIntegrationObjectMappings(integrationId:\$i){__typename}}\",\"variables\":{\"i\":\"${SMOKE_INTEGRATION_ID}\"}}"

mutual 'integration.getIntegrationObjectMapping' \
  "{\"query\":\"query(\$id:String!){getIntegrationObjectMapping(id:\$id){__typename}}\",\"variables\":{\"id\":\"${SMOKE_B_MAPPING_ID}\"}}" \
  "{\"query\":\"query(\$id:String!){getIntegrationObjectMapping(id:\$id){__typename}}\",\"variables\":{\"id\":\"${SMOKE_MAPPING_ID}\"}}"

mutual 'team.getInvites' \
  "{\"query\":\"query(\$p:String!){getInvites(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){getInvites(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'team.getTeamMembers' \
  "{\"query\":\"query(\$p:String!){getTeamMembers(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"query(\$p:String!){getTeamMembers(projectId:\$p){__typename}}\",\"variables\":{\"p\":\"${SMOKE_PROJECT_ID}\"}}"

if [ "$QUERIES_ONLY" -eq 1 ]; then echo; echo "(--queries-only set; skipping mutations)"; exit 0; fi

echo
echo "─────────────────────────────────────────────────────────────"
echo " The mutations below WILL EXECUTE on project $SMOKE_PROJECT_ID for any role"
echo " that has permission. Side effects include deletes, renames, invites,"
echo " segment creation, content publish/unpublish — this trashes the project's"
echo " fixtures. Use a dedicated smoke-fixture-* project (from prep), not real data."
echo "─────────────────────────────────────────────────────────────"
if [ "$NO_PROMPT" -ne 1 ]; then
  read -r -p "Proceed with mutations? [y/N] " ans
  [ "$ans" = "y" ] || { echo "stopped before mutations."; exit 0; }
fi

section "R-tier MUTATION — in-project (1 endpoint)"
run_endpoint 'team.activeUserProject' \
  "{\"query\":\"mutation(\$d:ActiveUserProjectInput!){activeUserProject(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_PROJECT_ID}\",\"userId\":\"e2e\"}}}"

section "W-tier MUTATIONS — in-project (42 endpoints, DESTRUCTIVE)"
run_endpoint 'content.createContent' \
  "{\"query\":\"mutation(\$d:ContentInput!){createContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"type\":\"flow\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'content.updateContent' \
  "{\"query\":\"mutation(\$d:ContentUpdateInput!){updateContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"content\":{}}}}"

run_endpoint 'content.duplicateContent' \
  "{\"query\":\"mutation(\$d:ContentDuplicateInput!){duplicateContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\"}}}"

run_endpoint 'content.updateContentStep' \
  "{\"query\":\"mutation(\$d:UpdateStepInput!,\$s:String!){updateContentStep(data:\$d,stepId:\$s){__typename}}\",\"variables\":{\"d\":{\"name\":\"spot-check-step\"},\"s\":\"${SMOKE_STEP_ID}\"}}"

run_endpoint 'content.addContentSteps' \
  "{\"query\":\"mutation(\$d:ContentStepsInput!){addContentSteps(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"steps\":[],\"themeId\":\"${SMOKE_THEME_ID}\",\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

run_endpoint 'content.addContentStep' \
  "{\"query\":\"mutation(\$d:CreateStepInput!){addContentStep(data:\$d){__typename}}\",\"variables\":{\"d\":{\"type\":\"tooltip\",\"versionId\":\"${SMOKE_VERSION_ID}\",\"sequence\":0}}}"

run_endpoint 'content.updateVersionLocationData' \
  "{\"query\":\"mutation(\$d:VersionUpdateLocalizationInput!){updateVersionLocationData(data:\$d){__typename}}\",\"variables\":{\"d\":{\"backup\":{},\"enabled\":true,\"localizationId\":\"${SMOKE_LOCALIZATION_ID}\",\"localized\":{},\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

run_endpoint 'content.updateContentVersion' \
  "{\"query\":\"mutation(\$d:VersionUpdateInput!){updateContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\",\"content\":{}}}}"

run_endpoint 'content.createContentVersion' \
  "{\"query\":\"mutation(\$d:ContentVersionInput!){createContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

run_endpoint 'content.restoreContentVersion' \
  "{\"query\":\"mutation(\$d:VersionIdInput!){restoreContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

run_endpoint 'content.publishedContentVersion' \
  "{\"query\":\"mutation(\$d:VersionIdInput!){publishedContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'content.unpublishedContentVersion' \
  "{\"query\":\"mutation(\$d:ContentIdInput!){unpublishedContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'content.deleteContent' \
  "{\"query\":\"mutation(\$d:ContentIdInput!){deleteContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\"}}}"

run_endpoint_per_role 'environments.createEnvironments' \
  "{\"query\":\"mutation(\$d:CreateEnvironmentInput!){createEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEnvironmentInput!){createEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"name\":\"e2e-admin\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEnvironmentInput!){createEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEnvironmentInput!){createEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

run_endpoint 'environments.updateEnvironments' \
  "{\"query\":\"mutation(\$d:UpdateEnvironmentInput!){updateEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_ID}\",\"name\":\"e2e\"}}}"

run_endpoint_per_role 'environments.deleteEnvironments' \
  "{\"query\":\"mutation(\$d:DeleteEnvironmentInput!){deleteEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEnvironmentInput!){deleteEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_FOR_ADMIN_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEnvironmentInput!){deleteEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEnvironmentInput!){deleteEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_FOR_OWNER_DELETE_ID}\"}}}"

run_endpoint 'biz.createSegment' \
  "{\"query\":\"mutation(\$d:CreatSegment!){createSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":\"USER\",\"dataType\":\"ALL\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

run_endpoint 'biz.updateSegment' \
  "{\"query\":\"mutation(\$d:UpdateSegment!){updateSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_ID}\"}}}"

run_endpoint_per_role 'biz.deleteSegment' \
  "{\"query\":\"mutation(\$d:DeleteSegment!){deleteSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteSegment!){deleteSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_FOR_ADMIN_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteSegment!){deleteSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteSegment!){deleteSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_FOR_OWNER_DELETE_ID}\"}}}"

run_endpoint 'biz.createBizUserOnSegment' \
  "{\"query\":\"mutation(\$d:CreateBizUserOnSegment!){createBizUserOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"userOnSegment\":[{\"bizUserId\":\"${SMOKE_BIZ_USER_ID}\",\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}]}}}"

run_endpoint 'biz.deleteBizUserOnSegment' \
  "{\"query\":\"mutation(\$d:DeleteBizUserOnSegment!){deleteBizUserOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizUserIds\":[\"${SMOKE_BIZ_USER_ID}\"],\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}}}"

run_endpoint_per_role 'biz.deleteBizUser' \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizUser(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_USER_FOR_OWNER_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizUser(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_USER_FOR_ADMIN_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizUser(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_USER_FOR_OWNER_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizUser(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_USER_FOR_OWNER_DELETE_ID}\"]}}}"

run_endpoint_per_role 'biz.deleteBizCompany' \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_COMPANY_FOR_OWNER_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_COMPANY_FOR_ADMIN_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_COMPANY_FOR_OWNER_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_COMPANY_FOR_OWNER_DELETE_ID}\"]}}}"

run_endpoint 'biz.createBizCompanyOnSegment' \
  "{\"query\":\"mutation(\$d:CreateBizCompanyOnSegment!){createBizCompanyOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"companyOnSegment\":[{\"bizCompanyId\":\"${SMOKE_BIZ_COMPANY_ID}\",\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}]}}}"

run_endpoint 'biz.deleteBizCompanyOnSegment' \
  "{\"query\":\"mutation(\$d:DeleteBizCompanyOnSegment!){deleteBizCompanyOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizCompanyIds\":[\"${SMOKE_BIZ_COMPANY_ID}\"],\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}}}"

run_endpoint_per_role 'localizations.createLocalization' \
  "{\"query\":\"mutation(\$d:CreateLocalizationInput!){createLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"code\":\"e2e-owner\",\"locale\":\"e2e-owner\",\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateLocalizationInput!){createLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"code\":\"e2e-admin\",\"locale\":\"e2e-admin\",\"name\":\"e2e-admin\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateLocalizationInput!){createLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"code\":\"e2e-owner\",\"locale\":\"e2e-owner\",\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateLocalizationInput!){createLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"code\":\"e2e-owner\",\"locale\":\"e2e-owner\",\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

run_endpoint 'localizations.updateLocalization' \
  "{\"query\":\"mutation(\$d:UpdateLocalizationInput!){updateLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_ID}\"}}}"

run_endpoint 'localizations.setDefaultLocalization' \
  "{\"query\":\"mutation(\$id:String!){setDefaultLocalization(id:\$id){__typename}}\",\"variables\":{\"id\":\"${SMOKE_LOCALIZATION_ID}\"}}"

run_endpoint_per_role 'localizations.deleteLocalization' \
  "{\"query\":\"mutation(\$d:DeleteLocalizationInput!){deleteLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteLocalizationInput!){deleteLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_FOR_ADMIN_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteLocalizationInput!){deleteLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteLocalizationInput!){deleteLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_FOR_OWNER_DELETE_ID}\"}}}"

run_endpoint_per_role 'attributes.createAttribute' \
  "{\"query\":\"mutation(\$d:CreateAttributeInput!){createAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":1,\"codeName\":\"e2e_attr_owner\",\"dataType\":1,\"description\":\"e2e\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateAttributeInput!){createAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":1,\"codeName\":\"e2e_attr_admin\",\"dataType\":1,\"description\":\"e2e\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateAttributeInput!){createAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":1,\"codeName\":\"e2e_attr_owner\",\"dataType\":1,\"description\":\"e2e\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateAttributeInput!){createAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":1,\"codeName\":\"e2e_attr_owner\",\"dataType\":1,\"description\":\"e2e\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

run_endpoint 'attributes.updateAttribute' \
  "{\"query\":\"mutation(\$d:UpdateAttributeInput!){updateAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_ID}\"}}}"

run_endpoint_per_role 'attributes.deleteAttribute' \
  "{\"query\":\"mutation(\$d:DeleteAttributeInput!){deleteAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteAttributeInput!){deleteAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_FOR_ADMIN_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteAttributeInput!){deleteAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteAttributeInput!){deleteAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_FOR_OWNER_DELETE_ID}\"}}}"

run_endpoint_per_role 'themes.createTheme' \
  "{\"query\":\"mutation(\$d:CreateThemeInput!){createTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"isDefault\":false,\"name\":\"e2e-theme-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateThemeInput!){createTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"isDefault\":false,\"name\":\"e2e-theme-admin\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateThemeInput!){createTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"isDefault\":false,\"name\":\"e2e-theme-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateThemeInput!){createTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"isDefault\":false,\"name\":\"e2e-theme-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

run_endpoint 'themes.updateTheme' \
  "{\"query\":\"mutation(\$d:UpdateThemeInput!){updateTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_ID}\"}}}"

run_endpoint 'themes.setDefaultTheme' \
  "{\"query\":\"mutation(\$t:String!){setDefaultTheme(themeId:\$t){__typename}}\",\"variables\":{\"t\":\"${SMOKE_THEME_ID}\"}}"

run_endpoint 'themes.copyTheme' \
  "{\"query\":\"mutation(\$d:CopyThemeInput!){copyTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_ID}\",\"name\":\"e2e-copy\"}}}"

run_endpoint_per_role 'themes.deleteTheme' \
  "{\"query\":\"mutation(\$d:DeleteThemeInput!){deleteTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteThemeInput!){deleteTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_FOR_ADMIN_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteThemeInput!){deleteTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteThemeInput!){deleteTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_FOR_OWNER_DELETE_ID}\"}}}"

run_endpoint_per_role 'events.createEvent' \
  "{\"query\":\"mutation(\$d:CreateEventInput!){createEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"attributeIds\":[],\"codeName\":\"e2e_event_owner\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEventInput!){createEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"attributeIds\":[],\"codeName\":\"e2e_event_admin\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEventInput!){createEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"attributeIds\":[],\"codeName\":\"e2e_event_owner\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEventInput!){createEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"attributeIds\":[],\"codeName\":\"e2e_event_owner\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

run_endpoint 'events.updateEvent' \
  "{\"query\":\"mutation(\$d:UpdateEventInput!){updateEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_ID}\",\"attributeIds\":[]}}}"

run_endpoint_per_role 'events.deleteEvent' \
  "{\"query\":\"mutation(\$d:DeleteEventInput!){deleteEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEventInput!){deleteEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_FOR_ADMIN_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEventInput!){deleteEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEventInput!){deleteEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_FOR_OWNER_DELETE_ID}\"}}}"

run_endpoint_per_role 'analytics.deleteSession' \
  "{\"query\":\"mutation(\$s:String!){deleteSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_DELETE_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){deleteSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_ADMIN_DELETE_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){deleteSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_DELETE_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){deleteSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_DELETE_ID}\"}}"

run_endpoint_per_role 'analytics.endSession' \
  "{\"query\":\"mutation(\$s:String!){endSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_END_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){endSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_ADMIN_END_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){endSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_END_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){endSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_END_ID}\"}}"

section "O-tier MUTATIONS — in-project (13 endpoints, DESTRUCTIVE)"
run_endpoint 'projects.updateProjectName' \
  "{\"query\":\"mutation(\$n:String!,\$p:String!){updateProjectName(name:\$n,projectId:\$p){__typename}}\",\"variables\":{\"n\":\"e2e\",\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'projects.updateProjectLicense' \
  "{\"query\":\"mutation(\$l:String!,\$p:String!){updateProjectLicense(license:\$l,projectId:\$p){__typename}}\",\"variables\":{\"l\":\"e2e\",\"p\":\"${SMOKE_PROJECT_ID}\"}}"

run_endpoint 'environments.createAccessToken' \
  "{\"query\":\"mutation(\$e:String!,\$i:CreateAccessTokenInput!){createAccessToken(environmentId:\$e,input:\$i){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"i\":{\"name\":\"e2e\"}}}"

run_endpoint 'environments.deleteAccessToken' \
  "{\"query\":\"mutation(\$a:String!,\$e:String!){deleteAccessToken(accessTokenId:\$a,environmentId:\$e)}\",\"variables\":{\"a\":\"${SMOKE_ACCESS_TOKEN_ID}\",\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

run_endpoint 'integration.updateIntegration' \
  "{\"query\":\"mutation(\$e:String!,\$i:UpdateIntegrationInput!,\$p:String!){updateIntegration(environmentId:\$e,input:\$i,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"i\":{},\"p\":\"salesforce\"}}"

run_endpoint 'integration.upsertIntegrationObjectMapping' \
  "{\"query\":\"mutation(\$i:CreateIntegrationObjectMappingInput!,\$ii:String!){upsertIntegrationObjectMapping(input:\$i,integrationId:\$ii){__typename}}\",\"variables\":{\"i\":{\"sourceObjectType\":\"account\",\"destinationObjectType\":\"company\"},\"ii\":\"${SMOKE_INTEGRATION_ID}\"}}"

run_endpoint 'integration.updateIntegrationObjectMapping' \
  "{\"query\":\"mutation(\$id:String!,\$i:UpdateIntegrationObjectMappingInput!){updateIntegrationObjectMapping(id:\$id,input:\$i){__typename}}\",\"variables\":{\"id\":\"${SMOKE_MAPPING_ID}\",\"i\":{}}}"

run_endpoint 'integration.deleteIntegrationObjectMapping' \
  "{\"query\":\"mutation(\$id:String!){deleteIntegrationObjectMapping(id:\$id)}\",\"variables\":{\"id\":\"${SMOKE_MAPPING_ID}\"}}"

run_endpoint 'integration.disconnectIntegration' \
  "{\"query\":\"mutation(\$e:String!,\$p:String!){disconnectIntegration(environmentId:\$e,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}"

run_endpoint_per_role 'team.inviteTeamMember' \
  "{\"query\":\"mutation(\$d:InviteTeamMemberInput!){inviteTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"email\":\"e2e-owner@test.example.com\",\"name\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"VIEWER\"}}}" \
  "{\"query\":\"mutation(\$d:InviteTeamMemberInput!){inviteTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"email\":\"e2e-other@test.example.com\",\"name\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"VIEWER\"}}}" \
  "{\"query\":\"mutation(\$d:InviteTeamMemberInput!){inviteTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"email\":\"e2e-other@test.example.com\",\"name\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"VIEWER\"}}}" \
  "{\"query\":\"mutation(\$d:InviteTeamMemberInput!){inviteTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"email\":\"e2e-other@test.example.com\",\"name\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"VIEWER\"}}}"

run_endpoint 'team.removeTeamMember' \
  "{\"query\":\"mutation(\$d:RemoveTeamMemberInput!){removeTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_PROJECT_ID}\",\"userId\":\"${SMOKE_REMOVABLE_USER_ID}\"}}}"

run_endpoint 'team.changeTeamMemberRole' \
  "{\"query\":\"mutation(\$d:ChangeTeamMemberRoleInput!){changeTeamMemberRole(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"ADMIN\",\"userId\":\"${SMOKE_REMOVABLE_USER_FOR_CHANGE_ROLE_ID}\"}}}"

run_endpoint 'team.cancelInvite' \
  "{\"query\":\"mutation(\$d:CancelInviteInput!){cancelInvite(data:\$d)}\",\"variables\":{\"d\":{\"inviteId\":\"${SMOKE_INVITE_ID}\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

section "Cross-project mutual MUTATIONS (56 endpoints × 2 directions)"
# If guard works, all of these return E0013 with zero side effects.
# If guard is broken (IDOR), A→B mutations EXECUTE on B — verify guard before running.
mutual 'team.activeUserProject' \
  "{\"query\":\"mutation(\$d:ActiveUserProjectInput!){activeUserProject(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_B_PROJECT_ID}\",\"userId\":\"e2e\"}}}" \
  "{\"query\":\"mutation(\$d:ActiveUserProjectInput!){activeUserProject(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_PROJECT_ID}\",\"userId\":\"e2e\"}}}"

mutual 'content.createContent' \
  "{\"query\":\"mutation(\$d:ContentInput!){createContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"type\":\"flow\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ContentInput!){createContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"type\":\"flow\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'content.updateContent' \
  "{\"query\":\"mutation(\$d:ContentUpdateInput!){updateContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"content\":{}}}}" \
  "{\"query\":\"mutation(\$d:ContentUpdateInput!){updateContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"content\":{}}}}"

mutual 'content.duplicateContent' \
  "{\"query\":\"mutation(\$d:ContentDuplicateInput!){duplicateContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ContentDuplicateInput!){duplicateContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\"}}}"

mutual 'content.updateContentStep' \
  "{\"query\":\"mutation(\$d:UpdateStepInput!,\$s:String!){updateContentStep(data:\$d,stepId:\$s){__typename}}\",\"variables\":{\"d\":{\"name\":\"spot-check-step\"},\"s\":\"${SMOKE_B_STEP_ID}\"}}" \
  "{\"query\":\"mutation(\$d:UpdateStepInput!,\$s:String!){updateContentStep(data:\$d,stepId:\$s){__typename}}\",\"variables\":{\"d\":{\"name\":\"spot-check-step\"},\"s\":\"${SMOKE_STEP_ID}\"}}"

mutual 'content.addContentSteps' \
  "{\"query\":\"mutation(\$d:ContentStepsInput!){addContentSteps(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"steps\":[],\"themeId\":\"${SMOKE_B_THEME_ID}\",\"versionId\":\"${SMOKE_B_VERSION_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ContentStepsInput!){addContentSteps(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"steps\":[],\"themeId\":\"${SMOKE_THEME_ID}\",\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

mutual 'content.addContentStep' \
  "{\"query\":\"mutation(\$d:CreateStepInput!){addContentStep(data:\$d){__typename}}\",\"variables\":{\"d\":{\"type\":\"tooltip\",\"versionId\":\"${SMOKE_B_VERSION_ID}\",\"sequence\":0}}}" \
  "{\"query\":\"mutation(\$d:CreateStepInput!){addContentStep(data:\$d){__typename}}\",\"variables\":{\"d\":{\"type\":\"tooltip\",\"versionId\":\"${SMOKE_VERSION_ID}\",\"sequence\":0}}}"

mutual 'content.updateVersionLocationData' \
  "{\"query\":\"mutation(\$d:VersionUpdateLocalizationInput!){updateVersionLocationData(data:\$d){__typename}}\",\"variables\":{\"d\":{\"backup\":{},\"enabled\":true,\"localizationId\":\"${SMOKE_B_LOCALIZATION_ID}\",\"localized\":{},\"versionId\":\"${SMOKE_B_VERSION_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:VersionUpdateLocalizationInput!){updateVersionLocationData(data:\$d){__typename}}\",\"variables\":{\"d\":{\"backup\":{},\"enabled\":true,\"localizationId\":\"${SMOKE_LOCALIZATION_ID}\",\"localized\":{},\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

mutual 'content.updateContentVersion' \
  "{\"query\":\"mutation(\$d:VersionUpdateInput!){updateContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_B_VERSION_ID}\",\"content\":{}}}}" \
  "{\"query\":\"mutation(\$d:VersionUpdateInput!){updateContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\",\"content\":{}}}}"

mutual 'content.createContentVersion' \
  "{\"query\":\"mutation(\$d:ContentVersionInput!){createContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_B_VERSION_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ContentVersionInput!){createContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

mutual 'content.restoreContentVersion' \
  "{\"query\":\"mutation(\$d:VersionIdInput!){restoreContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_B_VERSION_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:VersionIdInput!){restoreContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\"}}}"

mutual 'content.publishedContentVersion' \
  "{\"query\":\"mutation(\$d:VersionIdInput!){publishedContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_B_VERSION_ID}\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:VersionIdInput!){publishedContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"versionId\":\"${SMOKE_VERSION_ID}\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'content.unpublishedContentVersion' \
  "{\"query\":\"mutation(\$d:ContentIdInput!){unpublishedContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ContentIdInput!){unpublishedContentVersion(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'content.deleteContent' \
  "{\"query\":\"mutation(\$d:ContentIdInput!){deleteContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_B_CONTENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ContentIdInput!){deleteContent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"contentId\":\"${SMOKE_CONTENT_ID}\"}}}"

mutual 'environments.createEnvironments' \
  "{\"query\":\"mutation(\$d:CreateEnvironmentInput!){createEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEnvironmentInput!){createEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

mutual 'environments.updateEnvironments' \
  "{\"query\":\"mutation(\$d:UpdateEnvironmentInput!){updateEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"name\":\"e2e\"}}}" \
  "{\"query\":\"mutation(\$d:UpdateEnvironmentInput!){updateEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_ID}\",\"name\":\"e2e\"}}}"

mutual 'environments.deleteEnvironments' \
  "{\"query\":\"mutation(\$d:DeleteEnvironmentInput!){deleteEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_ENVIRONMENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEnvironmentInput!){deleteEnvironments(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ENVIRONMENT_FOR_OWNER_DELETE_ID}\"}}}"

mutual 'biz.createSegment' \
  "{\"query\":\"mutation(\$d:CreatSegment!){createSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":\"USER\",\"dataType\":\"ALL\",\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreatSegment!){createSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":\"USER\",\"dataType\":\"ALL\",\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\"}}}"

mutual 'biz.updateSegment' \
  "{\"query\":\"mutation(\$d:UpdateSegment!){updateSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_SEGMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:UpdateSegment!){updateSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_ID}\"}}}"

mutual 'biz.deleteSegment' \
  "{\"query\":\"mutation(\$d:DeleteSegment!){deleteSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_SEGMENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteSegment!){deleteSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_SEGMENT_FOR_OWNER_DELETE_ID}\"}}}"

mutual 'biz.createBizUserOnSegment' \
  "{\"query\":\"mutation(\$d:CreateBizUserOnSegment!){createBizUserOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"userOnSegment\":[{\"bizUserId\":\"${SMOKE_B_BIZ_USER_ID}\",\"segmentId\":\"${SMOKE_B_SEGMENT_ID}\"}]}}}" \
  "{\"query\":\"mutation(\$d:CreateBizUserOnSegment!){createBizUserOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"userOnSegment\":[{\"bizUserId\":\"${SMOKE_BIZ_USER_ID}\",\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}]}}}"

mutual 'biz.deleteBizUserOnSegment' \
  "{\"query\":\"mutation(\$d:DeleteBizUserOnSegment!){deleteBizUserOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizUserIds\":[\"${SMOKE_B_BIZ_USER_ID}\"],\"segmentId\":\"${SMOKE_B_SEGMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteBizUserOnSegment!){deleteBizUserOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizUserIds\":[\"${SMOKE_BIZ_USER_ID}\"],\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}}}"

mutual 'biz.deleteBizUser' \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizUser(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_B_BIZ_USER_FOR_OWNER_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizUser(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_USER_FOR_OWNER_DELETE_ID}\"]}}}"

mutual 'biz.deleteBizCompany' \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_B_BIZ_COMPANY_FOR_OWNER_DELETE_ID}\"]}}}" \
  "{\"query\":\"mutation(\$d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:\$d){__typename}}\",\"variables\":{\"d\":{\"environmentId\":\"${SMOKE_ENVIRONMENT_ID}\",\"ids\":[\"${SMOKE_BIZ_COMPANY_FOR_OWNER_DELETE_ID}\"]}}}"

mutual 'biz.createBizCompanyOnSegment' \
  "{\"query\":\"mutation(\$d:CreateBizCompanyOnSegment!){createBizCompanyOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"companyOnSegment\":[{\"bizCompanyId\":\"${SMOKE_B_BIZ_COMPANY_ID}\",\"segmentId\":\"${SMOKE_B_SEGMENT_ID}\"}]}}}" \
  "{\"query\":\"mutation(\$d:CreateBizCompanyOnSegment!){createBizCompanyOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"companyOnSegment\":[{\"bizCompanyId\":\"${SMOKE_BIZ_COMPANY_ID}\",\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}]}}}"

mutual 'biz.deleteBizCompanyOnSegment' \
  "{\"query\":\"mutation(\$d:DeleteBizCompanyOnSegment!){deleteBizCompanyOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizCompanyIds\":[\"${SMOKE_B_BIZ_COMPANY_ID}\"],\"segmentId\":\"${SMOKE_B_SEGMENT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteBizCompanyOnSegment!){deleteBizCompanyOnSegment(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizCompanyIds\":[\"${SMOKE_BIZ_COMPANY_ID}\"],\"segmentId\":\"${SMOKE_SEGMENT_ID}\"}}}"

mutual 'localizations.createLocalization' \
  "{\"query\":\"mutation(\$d:CreateLocalizationInput!){createLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"code\":\"e2e-owner\",\"locale\":\"e2e-owner\",\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateLocalizationInput!){createLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"code\":\"e2e-owner\",\"locale\":\"e2e-owner\",\"name\":\"e2e-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

mutual 'localizations.updateLocalization' \
  "{\"query\":\"mutation(\$d:UpdateLocalizationInput!){updateLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_LOCALIZATION_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:UpdateLocalizationInput!){updateLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_ID}\"}}}"

mutual 'localizations.setDefaultLocalization' \
  "{\"query\":\"mutation(\$id:String!){setDefaultLocalization(id:\$id){__typename}}\",\"variables\":{\"id\":\"${SMOKE_B_LOCALIZATION_ID}\"}}" \
  "{\"query\":\"mutation(\$id:String!){setDefaultLocalization(id:\$id){__typename}}\",\"variables\":{\"id\":\"${SMOKE_LOCALIZATION_ID}\"}}"

mutual 'localizations.deleteLocalization' \
  "{\"query\":\"mutation(\$d:DeleteLocalizationInput!){deleteLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_LOCALIZATION_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteLocalizationInput!){deleteLocalization(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_LOCALIZATION_FOR_OWNER_DELETE_ID}\"}}}"

mutual 'attributes.createAttribute' \
  "{\"query\":\"mutation(\$d:CreateAttributeInput!){createAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":1,\"codeName\":\"e2e_attr_owner\",\"dataType\":1,\"description\":\"e2e\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateAttributeInput!){createAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"bizType\":1,\"codeName\":\"e2e_attr_owner\",\"dataType\":1,\"description\":\"e2e\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

mutual 'attributes.updateAttribute' \
  "{\"query\":\"mutation(\$d:UpdateAttributeInput!){updateAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_ATTRIBUTE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:UpdateAttributeInput!){updateAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_ID}\"}}}"

mutual 'attributes.deleteAttribute' \
  "{\"query\":\"mutation(\$d:DeleteAttributeInput!){deleteAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_ATTRIBUTE_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteAttributeInput!){deleteAttribute(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_ATTRIBUTE_FOR_OWNER_DELETE_ID}\"}}}"

mutual 'themes.createTheme' \
  "{\"query\":\"mutation(\$d:CreateThemeInput!){createTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"isDefault\":false,\"name\":\"e2e-theme-owner\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateThemeInput!){createTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"isDefault\":false,\"name\":\"e2e-theme-owner\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

mutual 'themes.updateTheme' \
  "{\"query\":\"mutation(\$d:UpdateThemeInput!){updateTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_THEME_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:UpdateThemeInput!){updateTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_ID}\"}}}"

mutual 'themes.setDefaultTheme' \
  "{\"query\":\"mutation(\$t:String!){setDefaultTheme(themeId:\$t){__typename}}\",\"variables\":{\"t\":\"${SMOKE_B_THEME_ID}\"}}" \
  "{\"query\":\"mutation(\$t:String!){setDefaultTheme(themeId:\$t){__typename}}\",\"variables\":{\"t\":\"${SMOKE_THEME_ID}\"}}"

mutual 'themes.copyTheme' \
  "{\"query\":\"mutation(\$d:CopyThemeInput!){copyTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_THEME_ID}\",\"name\":\"e2e-copy\"}}}" \
  "{\"query\":\"mutation(\$d:CopyThemeInput!){copyTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_ID}\",\"name\":\"e2e-copy\"}}}"

mutual 'themes.deleteTheme' \
  "{\"query\":\"mutation(\$d:DeleteThemeInput!){deleteTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_THEME_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteThemeInput!){deleteTheme(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_THEME_FOR_OWNER_DELETE_ID}\"}}}"

mutual 'events.createEvent' \
  "{\"query\":\"mutation(\$d:CreateEventInput!){createEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"attributeIds\":[],\"codeName\":\"e2e_event_owner\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CreateEventInput!){createEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"attributeIds\":[],\"codeName\":\"e2e_event_owner\",\"displayName\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"

mutual 'events.updateEvent' \
  "{\"query\":\"mutation(\$d:UpdateEventInput!){updateEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_EVENT_ID}\",\"attributeIds\":[]}}}" \
  "{\"query\":\"mutation(\$d:UpdateEventInput!){updateEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_ID}\",\"attributeIds\":[]}}}"

mutual 'events.deleteEvent' \
  "{\"query\":\"mutation(\$d:DeleteEventInput!){deleteEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_B_EVENT_FOR_OWNER_DELETE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:DeleteEventInput!){deleteEvent(data:\$d){__typename}}\",\"variables\":{\"d\":{\"id\":\"${SMOKE_EVENT_FOR_OWNER_DELETE_ID}\"}}}"

mutual 'analytics.deleteSession' \
  "{\"query\":\"mutation(\$s:String!){deleteSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_B_SESSION_FOR_OWNER_DELETE_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){deleteSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_DELETE_ID}\"}}"

mutual 'analytics.endSession' \
  "{\"query\":\"mutation(\$s:String!){endSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_B_SESSION_FOR_OWNER_END_ID}\"}}" \
  "{\"query\":\"mutation(\$s:String!){endSession(sessionId:\$s)}\",\"variables\":{\"s\":\"${SMOKE_SESSION_FOR_OWNER_END_ID}\"}}"

mutual 'projects.updateProjectName' \
  "{\"query\":\"mutation(\$n:String!,\$p:String!){updateProjectName(name:\$n,projectId:\$p){__typename}}\",\"variables\":{\"n\":\"e2e\",\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"mutation(\$n:String!,\$p:String!){updateProjectName(name:\$n,projectId:\$p){__typename}}\",\"variables\":{\"n\":\"e2e\",\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'projects.updateProjectLicense' \
  "{\"query\":\"mutation(\$l:String!,\$p:String!){updateProjectLicense(license:\$l,projectId:\$p){__typename}}\",\"variables\":{\"l\":\"e2e\",\"p\":\"${SMOKE_B_PROJECT_ID}\"}}" \
  "{\"query\":\"mutation(\$l:String!,\$p:String!){updateProjectLicense(license:\$l,projectId:\$p){__typename}}\",\"variables\":{\"l\":\"e2e\",\"p\":\"${SMOKE_PROJECT_ID}\"}}"

mutual 'environments.createAccessToken' \
  "{\"query\":\"mutation(\$e:String!,\$i:CreateAccessTokenInput!){createAccessToken(environmentId:\$e,input:\$i){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"i\":{\"name\":\"e2e\"}}}" \
  "{\"query\":\"mutation(\$e:String!,\$i:CreateAccessTokenInput!){createAccessToken(environmentId:\$e,input:\$i){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"i\":{\"name\":\"e2e\"}}}"

mutual 'environments.deleteAccessToken' \
  "{\"query\":\"mutation(\$a:String!,\$e:String!){deleteAccessToken(accessTokenId:\$a,environmentId:\$e)}\",\"variables\":{\"a\":\"${SMOKE_B_ACCESS_TOKEN_ID}\",\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\"}}" \
  "{\"query\":\"mutation(\$a:String!,\$e:String!){deleteAccessToken(accessTokenId:\$a,environmentId:\$e)}\",\"variables\":{\"a\":\"${SMOKE_ACCESS_TOKEN_ID}\",\"e\":\"${SMOKE_ENVIRONMENT_ID}\"}}"

mutual 'integration.updateIntegration' \
  "{\"query\":\"mutation(\$e:String!,\$i:UpdateIntegrationInput!,\$p:String!){updateIntegration(environmentId:\$e,input:\$i,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"i\":{},\"p\":\"salesforce\"}}" \
  "{\"query\":\"mutation(\$e:String!,\$i:UpdateIntegrationInput!,\$p:String!){updateIntegration(environmentId:\$e,input:\$i,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"i\":{},\"p\":\"salesforce\"}}"

mutual 'integration.upsertIntegrationObjectMapping' \
  "{\"query\":\"mutation(\$i:CreateIntegrationObjectMappingInput!,\$ii:String!){upsertIntegrationObjectMapping(input:\$i,integrationId:\$ii){__typename}}\",\"variables\":{\"i\":{\"sourceObjectType\":\"account\",\"destinationObjectType\":\"company\"},\"ii\":\"${SMOKE_B_INTEGRATION_ID}\"}}" \
  "{\"query\":\"mutation(\$i:CreateIntegrationObjectMappingInput!,\$ii:String!){upsertIntegrationObjectMapping(input:\$i,integrationId:\$ii){__typename}}\",\"variables\":{\"i\":{\"sourceObjectType\":\"account\",\"destinationObjectType\":\"company\"},\"ii\":\"${SMOKE_INTEGRATION_ID}\"}}"

mutual 'integration.updateIntegrationObjectMapping' \
  "{\"query\":\"mutation(\$id:String!,\$i:UpdateIntegrationObjectMappingInput!){updateIntegrationObjectMapping(id:\$id,input:\$i){__typename}}\",\"variables\":{\"id\":\"${SMOKE_B_MAPPING_ID}\",\"i\":{}}}" \
  "{\"query\":\"mutation(\$id:String!,\$i:UpdateIntegrationObjectMappingInput!){updateIntegrationObjectMapping(id:\$id,input:\$i){__typename}}\",\"variables\":{\"id\":\"${SMOKE_MAPPING_ID}\",\"i\":{}}}"

mutual 'integration.deleteIntegrationObjectMapping' \
  "{\"query\":\"mutation(\$id:String!){deleteIntegrationObjectMapping(id:\$id)}\",\"variables\":{\"id\":\"${SMOKE_B_MAPPING_ID}\"}}" \
  "{\"query\":\"mutation(\$id:String!){deleteIntegrationObjectMapping(id:\$id)}\",\"variables\":{\"id\":\"${SMOKE_MAPPING_ID}\"}}"

mutual 'integration.disconnectIntegration' \
  "{\"query\":\"mutation(\$e:String!,\$p:String!){disconnectIntegration(environmentId:\$e,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_B_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}" \
  "{\"query\":\"mutation(\$e:String!,\$p:String!){disconnectIntegration(environmentId:\$e,provider:\$p){__typename}}\",\"variables\":{\"e\":\"${SMOKE_ENVIRONMENT_ID}\",\"p\":\"salesforce\"}}"

mutual 'team.inviteTeamMember' \
  "{\"query\":\"mutation(\$d:InviteTeamMemberInput!){inviteTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"email\":\"e2e-other@test.example.com\",\"name\":\"e2e\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\",\"role\":\"VIEWER\"}}}" \
  "{\"query\":\"mutation(\$d:InviteTeamMemberInput!){inviteTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"email\":\"e2e-other@test.example.com\",\"name\":\"e2e\",\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"VIEWER\"}}}"

mutual 'team.removeTeamMember' \
  "{\"query\":\"mutation(\$d:RemoveTeamMemberInput!){removeTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_B_PROJECT_ID}\",\"userId\":\"${SMOKE_B_REMOVABLE_USER_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:RemoveTeamMemberInput!){removeTeamMember(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_PROJECT_ID}\",\"userId\":\"${SMOKE_REMOVABLE_USER_ID}\"}}}"

mutual 'team.changeTeamMemberRole' \
  "{\"query\":\"mutation(\$d:ChangeTeamMemberRoleInput!){changeTeamMemberRole(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_B_PROJECT_ID}\",\"role\":\"ADMIN\",\"userId\":\"${SMOKE_B_REMOVABLE_USER_FOR_CHANGE_ROLE_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:ChangeTeamMemberRoleInput!){changeTeamMemberRole(data:\$d)}\",\"variables\":{\"d\":{\"projectId\":\"${SMOKE_PROJECT_ID}\",\"role\":\"ADMIN\",\"userId\":\"${SMOKE_REMOVABLE_USER_FOR_CHANGE_ROLE_ID}\"}}}"

mutual 'team.cancelInvite' \
  "{\"query\":\"mutation(\$d:CancelInviteInput!){cancelInvite(data:\$d)}\",\"variables\":{\"d\":{\"inviteId\":\"${SMOKE_B_INVITE_ID}\",\"projectId\":\"${SMOKE_B_PROJECT_ID}\"}}}" \
  "{\"query\":\"mutation(\$d:CancelInviteInput!){cancelInvite(data:\$d)}\",\"variables\":{\"d\":{\"inviteId\":\"${SMOKE_INVITE_ID}\",\"projectId\":\"${SMOKE_PROJECT_ID}\"}}}"
