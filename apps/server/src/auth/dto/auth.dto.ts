export interface TokenData {
  uid: string;
  accessToken: string;
  refreshToken: string;
}

export interface SendVerificationEmailJobData {
  sessionId: string;
}

export class JwtPayload {
  uid: string;
  email: string;
}

export type AuthProvider = 'email' | 'google' | 'github';

export type AuthConfigItem = {
  provider: AuthProvider;
};
