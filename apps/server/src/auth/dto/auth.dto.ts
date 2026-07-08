export interface TokenData {
  uid: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Returned by login/signup/oauth paths. Either we issued real tokens
 * (kind === 'tokens') or the user must complete a 2FA step first
 * (kind === 'challenge'); the resolver decides whether to set cookies.
 */
export type AuthResult =
  | { kind: 'tokens'; tokens: TokenData }
  | {
      kind: 'challenge';
      purpose: 'mfa-verify' | 'mfa-setup-required';
      challengeToken: string;
    };

export interface SendVerificationEmailJobData {
  sessionId: string;
}

export class JwtPayload {
  uid: string;
  email: string;
}

export interface SendMagicLinkEmailJobData {
  sessionId: string;
}

export interface SendResetPasswordEmailJobData {
  sessionId: string;
}
