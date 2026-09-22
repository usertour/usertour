/** An OIDC identity provider to connect to a project — what SsoService.createOidcProvider takes. */
export type NewOidcSsoProvider = {
  name: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  /** Explicit endpoint overrides; discovered from the issuer when absent. */
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
};
