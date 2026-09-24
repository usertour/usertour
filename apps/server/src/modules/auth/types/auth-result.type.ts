import type { TokenData } from './token-data.type';

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
