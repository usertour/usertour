/**
 * The fields of an identity provider to change — what SsoService.updateProvider
 * takes. `clientSecret` is write-only: present rotates it, absent keeps it.
 */
export type SsoProviderChanges = {
  name?: string;
  /** active | inactive */
  status?: string;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
};
