/** The validated authorize request, carried (signed) to the consent page. */
export interface TransactionClaims {
  kind: 'oauth_authorize';
  clientId: string;
  redirectUri: string;
  scope: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
}
