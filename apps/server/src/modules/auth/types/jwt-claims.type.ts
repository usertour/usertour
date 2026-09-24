/** The claims of an access token, as the JWT strategy reads them. */
export interface JwtClaims {
  userId: string;
  /**
   * Issued at
   */
  iat: number;
  /**
   * Expiration time
   */
  exp: number;
}
