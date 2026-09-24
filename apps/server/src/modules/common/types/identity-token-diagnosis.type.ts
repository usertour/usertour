/** Console validator result (settings page "Validate token" tool). */
export interface IdentityTokenDiagnosis {
  status:
    | 'valid'
    | 'expired'
    | 'not_yet_valid'
    | 'invalid_signature'
    | 'wrong_algorithm'
    | 'malformed'
    | 'missing_subject'
    | 'no_active_secret';
  subject?: string;
  companyId?: string;
  expiresAt?: Date;
}
