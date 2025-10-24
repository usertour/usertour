/**
 * JWT License payload structure
 */
export interface JWTLicensePayload {
  /** License plan type */
  plan: string;
  /** Subject (project name) */
  sub: string;
  /** Project identifier */
  projectId: string;
  /** JWT issued at timestamp */
  iat: number;
  /** JWT expiration timestamp */
  exp: number;
  /** JWT issuer */
  issuer: string;
  /** Array of enabled features, '*' means all features */
  features: string[];
}

/**
 * JWT License validation result
 */
export interface JWTLicenseValidationResult {
  /** Whether the license is valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Parsed license payload if valid */
  payload?: JWTLicensePayload;
  /** Whether the license has expired */
  isExpired?: boolean;
  /** Whether the license has a specific feature */
  hasFeature?: (feature: string) => boolean;
}

/**
 * JWT License validation options
 */
export interface JWTLicenseValidationOptions {
  /** Whether to check expiration (defaults to true) */
  checkExpiration?: boolean;
  /** Whether to verify signature (defaults to true) */
  verifySignature?: boolean;
  /** Current timestamp for expiration check (defaults to current time) */
  currentTime?: Date;
}

/**
 * JWT License generation options
 */
export interface JWTLicenseGenerationOptions {
  /** Project identifier */
  projectId: string;
  /** Array of features to enable */
  features: string[];
  /** Number of days until expiration */
  expiresInDays: number;
  /** Private key for signing */
  privateKey: string;
  /** Additional payload data */
  additionalData?: Record<string, any>;
}

/**
 * JWT License error types
 */
export enum JWTLicenseErrorType {
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED = 'EXPIRED',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
}
