import * as fs from 'node:fs';
import * as path from 'node:path';
import jwt from 'jsonwebtoken';
import type { JWTLicensePayload } from './types';

export interface JWTLicenseSignerOptions {
  /** RSA private key path */
  privateKeyPath: string;
  /** JWT issuer */
  issuer?: string;
  /** JWT algorithm */
  algorithm?: jwt.Algorithm;
}

export interface GenerateLicenseOptions {
  /** License plan type */
  plan: string;
  /** Subject (project name) */
  subject: string;
  /** Project identifier */
  projectId: string;
  /** Expiration days from now */
  expiresInDays: number;
  /** Array of enabled features, '*' means all features */
  features: string[];
  /** Custom issuer (optional) */
  issuer?: string;
}

export class JWTLicenseSigner {
  private privateKey: string;
  private issuer: string;
  private algorithm: jwt.Algorithm;

  constructor(options: JWTLicenseSignerOptions) {
    this.privateKey = this.loadPrivateKey(options.privateKeyPath);
    this.issuer = options.issuer || 'https://www.usertour.io';
    this.algorithm = options.algorithm || 'RS256';
  }

  /**
   * Load RSA private key from file
   */
  private loadPrivateKey(keyPath: string): string {
    try {
      const fullPath = path.resolve(keyPath);
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load private key from ${keyPath}: ${error}`);
    }
  }

  /**
   * Generate a JWT license token
   */
  generateLicense(options: GenerateLicenseOptions): string {
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
      return jwt.sign(payload, this.privateKey, {
        algorithm: this.algorithm,
        issuer: this.issuer,
      });
    } catch (error) {
      throw new Error(`Failed to generate JWT license: ${error}`);
    }
  }

  /**
   * Generate a license and return both token and payload info
   */
  generateLicenseWithInfo(options: GenerateLicenseOptions): {
    token: string;
    payload: JWTLicensePayload;
    expiresAt: Date;
  } {
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

    const token = jwt.sign(payload, this.privateKey, {
      algorithm: this.algorithm,
      issuer: this.issuer,
    });

    return {
      token,
      payload,
      expiresAt: new Date(expiresAt * 1000),
    };
  }

  /**
   * Decode a JWT token without verification (for debugging)
   */
  decodeToken(token: string): JWTLicensePayload | null {
    try {
      return jwt.decode(token) as JWTLicensePayload;
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  }

  /**
   * Get token information without verification
   */
  getTokenInfo(token: string): {
    header: jwt.JwtHeader;
    payload: JWTLicensePayload;
    signature: string;
  } | null {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return null;
      }

      return {
        header: decoded.header,
        payload: decoded.payload as JWTLicensePayload,
        signature: decoded.signature,
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }
}
