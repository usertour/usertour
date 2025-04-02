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

export interface SendMagicLinkEmailJobData {
  sessionId: string;
}

export interface SendResetPasswordEmailJobData {
  sessionId: string;
}

export interface InitializeProjectJobData {
  projectId: string;
}
