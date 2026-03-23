import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import jwt from 'jsonwebtoken';
import { JWTLicenseSigner } from '../jwt-license-signer';
import { JWTLicenseValidator } from '../jwt-license-validator';

// Generate RSA key pair for testing
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Write private key to temp file for signer
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-test-'));
const privateKeyPath = path.join(tmpDir, 'test-private.pem');
fs.writeFileSync(privateKeyPath, privateKey);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('JWTLicenseSigner + JWTLicenseValidator', () => {
  const signer = new JWTLicenseSigner({ privateKeyPath });

  describe('backward compatibility (project scope, no explicit scope)', () => {
    it('should generate and validate a legacy project license without scope field', () => {
      // Simulate a legacy license by signing manually without scope
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'pro',
        sub: 'Test Project',
        projectId: 'proj-123',
        iat: now,
        exp: now + 86400 * 30,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(true);
      expect(result.payload?.scope).toBe('project');
      expect(result.payload?.projectId).toBe('proj-123');
    });
  });

  describe('project scope', () => {
    it('should generate and validate a project-scoped license', () => {
      const token = signer.generateLicense({
        plan: 'pro',
        subject: 'Test Project',
        scope: 'project',
        projectId: 'proj-456',
        expiresInDays: 30,
        features: ['feature-a', 'feature-b'],
      });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(true);
      expect(result.payload?.scope).toBe('project');
      expect(result.payload?.projectId).toBe('proj-456');
      expect(result.payload?.plan).toBe('pro');
      expect(result.hasFeature?.('feature-a')).toBe(true);
      expect(result.hasFeature?.('feature-c')).toBe(false);
    });

    it('should fail validation for project scope without projectId', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'pro',
        sub: 'Test',
        scope: 'project',
        iat: now,
        exp: now + 86400 * 30,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('projectId');
    });
  });

  describe('instance scope', () => {
    it('should generate and validate an instance-scoped license', () => {
      const token = signer.generateLicense({
        plan: 'enterprise',
        subject: 'Test Instance',
        scope: 'instance',
        instanceId: 'inst-123',
        projectLimit: 10,
        expiresInDays: 365,
        features: ['*'],
      });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(true);
      expect(result.payload?.scope).toBe('instance');
      expect(result.payload?.instanceId).toBe('inst-123');
      expect(result.payload?.projectLimit).toBe(10);
      expect(result.payload?.plan).toBe('enterprise');
      expect(result.hasFeature?.('anything')).toBe(true);
    });

    it('should validate instance scope with null projectLimit (unlimited)', () => {
      const token = signer.generateLicense({
        plan: 'enterprise',
        subject: 'Test Instance',
        scope: 'instance',
        instanceId: 'inst-456',
        projectLimit: null,
        expiresInDays: 365,
        features: ['*'],
      });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(true);
      expect(result.payload?.projectLimit).toBeNull();
    });

    it('should fail validation for instance scope without instanceId', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'enterprise',
        sub: 'Test',
        scope: 'instance',
        iat: now,
        exp: now + 86400 * 365,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('instanceId');
    });

    it('should fail validation for invalid projectLimit (negative)', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'enterprise',
        sub: 'Test',
        scope: 'instance',
        instanceId: 'inst-789',
        projectLimit: -5,
        iat: now,
        exp: now + 86400 * 365,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('projectLimit');
    });

    it('should fail validation for invalid projectLimit (non-integer)', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'enterprise',
        sub: 'Test',
        scope: 'instance',
        instanceId: 'inst-789',
        projectLimit: 3.5,
        iat: now,
        exp: now + 86400 * 365,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('projectLimit');
    });
  });

  describe('generateLicenseWithInfo', () => {
    it('should return token, payload, and expiresAt for project scope', () => {
      const result = signer.generateLicenseWithInfo({
        plan: 'pro',
        subject: 'My Project',
        scope: 'project',
        projectId: 'proj-999',
        expiresInDays: 30,
        features: ['feature-x'],
      });

      expect(result.token).toBeTruthy();
      expect(result.payload.scope).toBe('project');
      expect(result.payload.projectId).toBe('proj-999');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should return token, payload, and expiresAt for instance scope', () => {
      const result = signer.generateLicenseWithInfo({
        plan: 'enterprise',
        subject: 'My Instance',
        scope: 'instance',
        instanceId: 'inst-999',
        projectLimit: 50,
        expiresInDays: 365,
        features: ['*'],
      });

      expect(result.token).toBeTruthy();
      expect(result.payload.scope).toBe('instance');
      expect(result.payload.instanceId).toBe('inst-999');
      expect(result.payload.projectLimit).toBe(50);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('expiration', () => {
    it('should detect expired licenses', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'pro',
        sub: 'Test',
        scope: 'project',
        projectId: 'proj-exp',
        iat: now - 86400 * 60,
        exp: now - 86400,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
      });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
    });

    it('should skip expiration check when disabled', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'pro',
        sub: 'Test',
        scope: 'project',
        projectId: 'proj-exp',
        iat: now - 86400 * 60,
        exp: now - 86400,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey, {
        checkExpiration: false,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid tokens', () => {
    it('should reject tampered tokens', () => {
      const token = signer.generateLicense({
        plan: 'pro',
        subject: 'Test',
        scope: 'project',
        projectId: 'proj-123',
        expiresInDays: 30,
        features: ['*'],
      });

      // Tamper with the token
      const tampered = `${token.slice(0, -5)}XXXXX`;
      const result = JWTLicenseValidator.validateLicense(tampered, publicKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('JWT validation failed');
    });

    it('should reject tokens signed with wrong key', () => {
      const { privateKey: wrongKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const now = Math.floor(Date.now() / 1000);
      const payload: any = {
        plan: 'pro',
        sub: 'Test',
        scope: 'project',
        projectId: 'proj-123',
        iat: now,
        exp: now + 86400 * 30,
        issuer: 'https://www.usertour.io',
        features: ['*'],
      };
      const token = jwt.sign(payload, wrongKey, { algorithm: 'RS256' });

      const result = JWTLicenseValidator.validateLicense(token, publicKey);
      expect(result.isValid).toBe(false);
    });
  });
});
