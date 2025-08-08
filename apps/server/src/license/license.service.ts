import { Injectable } from '@nestjs/common';
import { JWTLicenseValidator } from '@/utils/jwt-license-validator';
import type {
  JWTLicenseValidationOptions,
  JWTLicenseValidationResult,
  JWTLicensePayload,
} from '@usertour/types';

// Embedded public key for license validation
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq3WP3kGytaqtAL86jD4b
0yIXBNQ6utsKfn8XtfrH/6ovSDJ47VDDOkMZwDmJ9KSTbyISc0z7KzSNXPXveY2F
n1Mm+5wZGnHdpLzHYRVOFPP7CRM2UWETb9oRsIm1mSu4Sji8gveTxYREonjwWU6m
2+wllLH5cF/+Jd8BG9BbCSwxUnkqnXcEqMtlqpqI3tNcPqXdtnqBPUd0yaAKATnQ
2FJ0mtew5ToxO7kDYS9WmMhKLtt6xQM4YO8VJYA+8GvLVLTGOPLccqRs0sq0B+Zu
VGoyv+BuHO3cPJMglMm8GxeukByP7l/qjGNvm5EPEm+TPK7dbmMtUW0k2K2ZXME2
nwIDAQAB
-----END PUBLIC KEY-----`;

@Injectable()
export class LicenseService {
  /**
   * Get embedded public key
   */
  private getPublicKey(): string {
    return LICENSE_PUBLIC_KEY;
  }

  /**
   * Validate a JWT license token
   */
  async validateLicense(
    licenseToken: string,
    options?: Partial<JWTLicenseValidationOptions>,
  ): Promise<JWTLicenseValidationResult> {
    try {
      const publicKey = this.getPublicKey();
      return JWTLicenseValidator.validateLicense(licenseToken, publicKey, options);
    } catch (error) {
      return {
        isValid: false,
        error: `License validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if license has a specific feature
   */
  async hasFeature(licenseToken: string, feature: string): Promise<boolean> {
    try {
      const publicKey = this.getPublicKey();
      const result = JWTLicenseValidator.validateLicense(licenseToken, publicKey, {
        checkExpiration: false,
      });

      if (!result.isValid || !result.hasFeature) {
        return false;
      }

      return result.hasFeature(feature);
    } catch {
      return false;
    }
  }

  /**
   * Check if license is expired
   */
  async isExpired(licenseToken: string): Promise<boolean> {
    try {
      const publicKey = this.getPublicKey();
      const result = JWTLicenseValidator.validateLicense(licenseToken, publicKey, {
        checkExpiration: true,
      });

      return result.isExpired ?? false;
    } catch {
      return true; // Consider expired if we can't check
    }
  }

  /**
   * Get license payload without validation
   */
  async getLicensePayload(licenseToken: string): Promise<JWTLicensePayload | null> {
    try {
      return JWTLicenseValidator.decodeLicense(licenseToken);
    } catch {
      return null;
    }
  }

  /**
   * Get expiration information
   */
  async getExpirationInfo(licenseToken: string): Promise<{
    isExpired: boolean;
    expiresAt: Date;
    daysUntilExpiration: number;
  } | null> {
    try {
      const payload = await this.getLicensePayload(licenseToken);
      if (!payload) {
        return null;
      }

      return JWTLicenseValidator.getExpirationInfo(payload);
    } catch {
      return null;
    }
  }

  /**
   * Get license plan
   */
  async getLicensePlan(licenseToken: string): Promise<string | null> {
    const payload = await this.getLicensePayload(licenseToken);
    return payload?.plan || null;
  }

  /**
   * Get license features
   */
  async getLicenseFeatures(licenseToken: string): Promise<string[]> {
    const payload = await this.getLicensePayload(licenseToken);
    return payload?.features || [];
  }

  /**
   * Get project ID from license
   */
  async getProjectId(licenseToken: string): Promise<string | null> {
    const payload = await this.getLicensePayload(licenseToken);
    return payload?.projectId || null;
  }

  /**
   * Clear cached public key (useful for testing or key rotation)
   * Note: No longer needed since public key is embedded
   */
  clearCache(): void {
    // No-op: public key is now embedded as constant
  }
}
