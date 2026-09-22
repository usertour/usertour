/**
 * Claims we read from a verified identity token. Extra claims are ignored.
 * `sub`/`companyId` are typed unknown because customer JWT libraries may emit
 * them as JSON numbers — comparison always goes through claimMatches.
 */
export interface IdentityTokenPayload {
  sub?: unknown;
  companyId?: unknown;
  exp?: number;
}
