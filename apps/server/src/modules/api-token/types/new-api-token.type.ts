/** A personal API token to mint — what ApiTokenService.createToken takes. */
export type NewApiToken = {
  name: string;
  projectIds: string[];
  scopes: string[];
  /** Omitted = all environments of the token's projects. */
  environmentIds?: string[];
  expiresAt?: Date;
};
