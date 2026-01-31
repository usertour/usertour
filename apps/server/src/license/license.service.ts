import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWTLicenseValidator } from '@usertour/license';
import * as jwt from 'jsonwebtoken';
import type {
  JWTLicenseValidationOptions,
  JWTLicenseValidationResult,
  JWTLicensePayload,
} from '@usertour/types';

// Default embedded public key for license validation
// This can be overridden by LICENSE_PUBLIC_KEY environment variable
const DEFAULT_LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq3WP3kGytaqtAL86jD4b
0yIXBNQ6utsKfn8XtfrH/6ovSDJ47VDDOkMZwDmJ9KSTbyISc0z7KzSNXPXveY2F
n1Mm+5wZGnHdpLzHYRVOFPP7CRM2UWETb9oRsIm1mSu4Sji8gveTxYREonjwWU6m
2+wllLH5cF/+Jd8BG9BbCSwxUnkqnXcEqMtlqpqI3tNcPqXdtnqBPUd0yaAKATnQ
2FJ0mtew5ToxO7kDYS9WmMhKLtt6xQM4YO8VJYA+8GvLVLTGOPLccqRs0sq0B+Zu
VGoyv+BuHO3cPJMglMm8GxeukByP7l/qjGNvm5EPEm+TPK7dbmMtUW0k2K2ZXME2
nwIDAQAB
-----END PUBLIC KEY-----`;

export interface GenerateLicenseOptions {
  plan: string;
  subject: string;
  projectId: string;
  expiresInDays: number;
  features: string[];
  issuer?: string;
}

export interface GeneratedLicenseResult {
  token: string;
  payload: JWTLicensePayload;
  expiresAt: Date;
}

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);
  private privateKey: string | null = null;
  private publicKey: string;
  private issuer: string;

  constructor(private configService: ConfigService) {
    // Load public key from environment or use default
    const envPublicKey = this.configService.get<string>('LICENSE_PUBLIC_KEY');
    this.publicKey = envPublicKey || DEFAULT_LICENSE_PUBLIC_KEY;

    // Load private key from environment (base64 encoded) for license generation
    const privateKeyB64 = this.configService.get<string>('LICENSE_PRIVATE_KEY');
    if (privateKeyB64) {
      try {
        this.privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
        this.logger.log('License private key loaded from environment');
      } catch (error) {
        this.logger.warn('Failed to decode LICENSE_PRIVATE_KEY from base64');
      }
    }

    // Load issuer from environment or use default
    this.issuer = this.configService.get<string>('LICENSE_ISSUER') || 'https://www.usertour.io';
  }

  /**
   * Get the public key used for validation
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Check if license generation is available (private key is configured)
   */
  canGenerateLicenses(): boolean {
    return this.privateKey !== null;
  }

  /**
   * Get the configured issuer
   */
  getIssuer(): string {
    return this.issuer;
  }

  /**
   * Get license admin status
   */
  getLicenseAdminStatus(): {
    isConfigured: boolean;
    canGenerateLicenses: boolean;
    issuer: string;
    message?: string;
  } {
    const canGenerate = this.canGenerateLicenses();
    return {
      isConfigured: true,
      canGenerateLicenses: canGenerate,
      issuer: this.issuer,
      message: canGenerate
        ? 'License admin is fully configured and can generate licenses'
        : 'License validation is available. Set LICENSE_PRIVATE_KEY to enable license generation.',
    };
  }

  /**
   * Generate a JWT license token
   */
  generateLicense(options: GenerateLicenseOptions): GeneratedLicenseResult {
    if (!this.privateKey) {
      throw new Error(
        'License generation is not available. Set LICENSE_PRIVATE_KEY environment variable.',
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + options.expiresInDays * 24 * 60 * 60;

    const payload: JWTLicensePayload = {
      plan: options.plan,
      sub: options.subject,
      projectId: options.projectId,
      iat: now,
      exp: expiresAt,
      issuer: options.issuer || this.issuer,
      features: options.features,
    };

    try {
      const token = jwt.sign(payload, this.privateKey, {
        algorithm: 'RS256',
        issuer: this.issuer,
      });

      return {
        token,
        payload,
        expiresAt: new Date(expiresAt * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to generate license: ${error.message}`);
      throw new Error(`Failed to generate license: ${error.message}`);
    }
  }

  /**
   * Validate a JWT license token
   */
  async validateLicense(
    licenseToken: string,
    options?: Partial<JWTLicenseValidationOptions>,
  ): Promise<JWTLicenseValidationResult> {
    try {
      return JWTLicenseValidator.validateLicense(licenseToken, this.publicKey, options);
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
      const result = JWTLicenseValidator.validateLicense(licenseToken, this.publicKey, {
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
      const result = JWTLicenseValidator.validateLicense(licenseToken, this.publicKey, {
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
   * Validate license with full details for admin purposes
   */
  async validateLicenseWithDetails(licenseToken: string): Promise<{
    isValid: boolean;
    error?: string;
    isExpired?: boolean;
    payload?: JWTLicensePayload;
    daysRemaining?: number;
  }> {
    try {
      const validationResult = await this.validateLicense(licenseToken);

      if (!validationResult.isValid) {
        return {
          isValid: false,
          error: validationResult.error,
        };
      }

      const payload = await this.getLicensePayload(licenseToken);
      const expirationInfo = await this.getExpirationInfo(licenseToken);

      return {
        isValid: true,
        isExpired: expirationInfo?.isExpired ?? false,
        payload: payload || undefined,
        daysRemaining: expirationInfo?.daysUntilExpiration,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear cached public key (useful for testing or key rotation)
   * Note: Reloads from environment or uses default
   */
  clearCache(): void {
    const envPublicKey = this.configService.get<string>('LICENSE_PUBLIC_KEY');
    this.publicKey = envPublicKey || DEFAULT_LICENSE_PUBLIC_KEY;
  }
}
