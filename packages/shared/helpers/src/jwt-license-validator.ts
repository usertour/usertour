import jwt from 'jsonwebtoken';
import type {
  JWTLicensePayload,
  JWTLicenseValidationResult,
  JWTLicenseValidationOptions,
} from '@usertour/types';

/**
 * JWT License validator
 */
export const JWTLicenseValidator = {
  /**
   * Validate a JWT license
   * @param license - JWT license string
   * @param publicKey - RSA public key in PEM format
   * @param options - Validation options
   * @returns Validation result
   */
  validateLicense(
    license: string,
    publicKey: string,
    options: JWTLicenseValidationOptions = {},
  ): JWTLicenseValidationResult {
    try {
      const { checkExpiration = true, currentTime = new Date() } = options;

      // Verify JWT signature and decode
      const decoded = jwt.verify(license, publicKey, {
        algorithms: ['RS256'],
        ignoreExpiration: !checkExpiration,
      }) as JWTLicensePayload;

      // Validate required fields
      const fieldValidation = this.validateRequiredFields(decoded);
      if (!fieldValidation.isValid) {
        return fieldValidation;
      }

      // Check expiration if enabled
      if (checkExpiration) {
        const expirationValidation = this.checkExpiration(decoded, currentTime);
        if (!expirationValidation.isValid) {
          return expirationValidation;
        }
      }

      // Create feature checker function
      const hasFeature = (feature: string): boolean => {
        return decoded.features.includes('*') || decoded.features.includes(feature);
      };

      return {
        isValid: true,
        payload: decoded,
        isExpired: false,
        hasFeature,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          isValid: false,
          error: `JWT validation failed: ${error.message}`,
        };
      }
      if (error instanceof jwt.TokenExpiredError) {
        return {
          isValid: false,
          error: `License expired: ${error.message}`,
          isExpired: true,
        };
      }
      return {
        isValid: false,
        error: `License validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  /**
   * Validate that all required fields are present in license payload
   * @param payload - License payload to validate
   * @returns Validation result
   */
  validateRequiredFields(payload: JWTLicensePayload): JWTLicenseValidationResult {
    const requiredFields = ['plan', 'sub', 'projectId', 'iat', 'exp', 'issuer', 'features'];

    for (const field of requiredFields) {
      if (!(field in payload)) {
        return {
          isValid: false,
          error: `Missing required field: ${field}`,
        };
      }
    }

    // Validate field types
    if (typeof payload.plan !== 'string' || !payload.plan.trim()) {
      return {
        isValid: false,
        error: 'Invalid plan: must be a non-empty string',
      };
    }

    if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
      return {
        isValid: false,
        error: 'Invalid sub: must be a non-empty string',
      };
    }

    if (typeof payload.projectId !== 'string' || !payload.projectId.trim()) {
      return {
        isValid: false,
        error: 'Invalid projectId: must be a non-empty string',
      };
    }

    if (typeof payload.issuer !== 'string' || !payload.issuer.trim()) {
      return {
        isValid: false,
        error: 'Invalid issuer: must be a non-empty string',
      };
    }

    if (!Array.isArray(payload.features)) {
      return {
        isValid: false,
        error: 'Invalid features: must be an array',
      };
    }

    // Validate timestamps
    if (typeof payload.iat !== 'number' || payload.iat <= 0) {
      return {
        isValid: false,
        error: 'Invalid iat: must be a positive number',
      };
    }

    if (typeof payload.exp !== 'number' || payload.exp <= 0) {
      return {
        isValid: false,
        error: 'Invalid exp: must be a positive number',
      };
    }

    if (payload.iat >= payload.exp) {
      return {
        isValid: false,
        error: 'Invalid timestamps: iat must be before exp',
      };
    }

    return { isValid: true };
  },

  /**
   * Check if license has expired
   * @param payload - License payload
   * @param currentTime - Current time to check against (defaults to now)
   * @returns Validation result
   */
  checkExpiration(
    payload: JWTLicensePayload,
    currentTime: Date = new Date(),
  ): JWTLicenseValidationResult {
    const now = Math.floor(currentTime.getTime() / 1000);
    const expiresAt = payload.exp;

    if (now > expiresAt) {
      return {
        isValid: false,
        error: `License expired on ${new Date(expiresAt * 1000).toISOString()}`,
        isExpired: true,
      };
    }

    return { isValid: true, isExpired: false };
  },

  /**
   * Check if license has a specific feature
   * @param payload - License payload
   * @param feature - Feature to check
   * @returns Whether the feature is available
   */
  hasFeature(payload: JWTLicensePayload, feature: string): boolean {
    return payload.features.includes('*') || payload.features.includes(feature);
  },

  /**
   * Get license expiration status
   * @param payload - License payload
   * @param currentTime - Current time to check against (defaults to now)
   * @returns Expiration information
   */
  getExpirationInfo(payload: JWTLicensePayload, currentTime: Date = new Date()) {
    const now = Math.floor(currentTime.getTime() / 1000);
    const expiresAt = payload.exp;
    const isExpired = now > expiresAt;
    const daysUntilExpiration = Math.ceil((expiresAt - now) / (24 * 60 * 60));

    return {
      isExpired,
      expiresAt: new Date(expiresAt * 1000),
      daysUntilExpiration: isExpired ? 0 : daysUntilExpiration,
    };
  },

  /**
   * Decode JWT license without verification (for debugging)
   * @param license - JWT license string
   * @returns Decoded payload or null if invalid
   */
  decodeLicense(license: string): JWTLicensePayload | null {
    try {
      const decoded = jwt.decode(license) as JWTLicensePayload;
      return decoded;
    } catch {
      return null;
    }
  },
};
