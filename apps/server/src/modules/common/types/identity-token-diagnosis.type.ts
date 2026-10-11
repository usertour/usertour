import type { IdentityTokenStatus } from './identity-token-status.type';

/** Console validator result (settings page "Validate token" tool). */
export interface IdentityTokenDiagnosis {
  status: IdentityTokenStatus;
  subject?: string;
  companyId?: string;
  expiresAt?: Date;
}
