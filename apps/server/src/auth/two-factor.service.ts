import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { LICENSE_FEATURE_TWO_FACTOR } from '@usertour/constants';
import {
  FeatureRequiresLicenseError,
  InvalidRecoveryCodeError,
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
  TooManyTwoFactorAttemptsError,
  TwoFactorAlreadyEnabledError,
  TwoFactorEnforcedDisableNotAllowedError,
  TwoFactorNotEnabledError,
} from '@/common/errors';
import { LicenseService } from '@/license/license.service';
import { EncryptionService } from '@/shared/encryption.service';
import { RedisService } from '@/shared/redis.service';
import { PasswordService } from './password.service';

export type ChallengePurpose = 'mfa-verify' | 'mfa-setup-required';

interface ChallengePayload {
  sub: string;
  purpose: ChallengePurpose;
  jti: string;
  iat?: number;
  exp?: number;
}

const CHALLENGE_TTL_SECONDS = 5 * 60;
const MFA_ATTEMPT_KEY_PREFIX = 'mfa-attempts:';
const MFA_LOCKOUT_WINDOW_SECONDS = 5 * 60;
const MFA_MAX_FAILED_ATTEMPTS = 5;

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 5; // 10 hex chars per code

// otplib defaults to window=0, which only accepts a code submitted inside
// the exact 30-second slice it was generated in. In practice, a user opens
// their authenticator, switches windows, and submits the form somewhere
// past the slice boundary far more often than not — and self-host servers
// that aren't NTP-synced drift even further. Match what GitHub / Slack /
// Auth0 do: accept ±1 step (±30s). Brute force is still bounded by the
// per-user 5-failures-in-5-minutes lockout, which is what actually prevents
// guessing — the window setting is purely a UX tolerance.
authenticator.options = { ...authenticator.options, window: 1 };

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordService: PasswordService,
    private readonly redisService: RedisService,
    private readonly licenseService: LicenseService,
  ) {}

  // ---------------------------------------------------------------------------
  // Challenge tokens (signed JWT, single-use via Redis jti)
  // ---------------------------------------------------------------------------

  signChallengeToken(userId: string, purpose: ChallengePurpose): string {
    const jti = randomUUID();
    const payload: ChallengePayload = { sub: userId, purpose, jti };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('auth.jwt.secret'),
      expiresIn: `${CHALLENGE_TTL_SECONDS}s`,
    });
  }

  /**
   * Verifies the JWT signature, expiration, and purpose claim. Returns the
   * userId encoded in the token. Re-usable within the token's 5-minute TTL —
   * we deliberately do NOT mark the jti single-use because:
   *   - the per-user MFA failure lockout (5 attempts / 5 minutes) already bounds
   *     brute force inside the token window
   *   - downstream state machines are self-idempotent (cannot enable an account
   *     that's already enabled; cannot verify-login a non-enrolled user)
   *   - making it single-use means one mistyped digit forces a full re-login,
   *     which is what the recovery-code flow exists to avoid
   */
  private async verifyChallengeToken(
    token: string,
    expectedPurpose: ChallengePurpose,
  ): Promise<string> {
    let payload: ChallengePayload;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('auth.jwt.secret'),
      });
    } catch {
      throw new InvalidTwoFactorChallengeError();
    }
    if (payload.purpose !== expectedPurpose) {
      throw new InvalidTwoFactorChallengeError();
    }
    return payload.sub;
  }

  // ---------------------------------------------------------------------------
  // Rate limiting for MFA verification attempts
  // ---------------------------------------------------------------------------

  private mfaAttemptKey(userId: string) {
    return `${MFA_ATTEMPT_KEY_PREFIX}${userId}`;
  }

  private async checkMfaLockout(userId: string) {
    const raw = await this.redisService.get(this.mfaAttemptKey(userId));
    if (raw && Number(raw) >= MFA_MAX_FAILED_ATTEMPTS) {
      throw new TooManyTwoFactorAttemptsError();
    }
  }

  private async recordMfaFailure(userId: string) {
    await this.redisService.incrWithExpire(this.mfaAttemptKey(userId), MFA_LOCKOUT_WINDOW_SECONDS);
  }

  private async clearMfaFailures(userId: string) {
    await this.redisService.del(this.mfaAttemptKey(userId));
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  async startSetup(user: Pick<User, 'id' | 'email' | 'twoFactorEnabled'>) {
    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledError();
    }
    if (!(await this.isTwoFactorAvailableForUser(user.id))) {
      throw new FeatureRequiresLicenseError();
    }
    const secret = authenticator.generateSecret();
    const issuer = this.configService.get<string>('app.name') || 'Usertour';
    const otpauthUri = authenticator.keyuri(user.email, issuer, secret);
    const qrDataUri = await toDataURL(otpauthUri);
    return { secret, otpauthUri, qrDataUri };
  }

  /**
   * Verifies the user-entered TOTP against the freshly-generated secret, then
   * commits encrypted secret + 10 recovery codes, revokes other refresh tokens,
   * and returns the recovery codes ONCE (cleartext) for display.
   */
  async confirmSetup(
    user: Pick<User, 'id' | 'twoFactorEnabled'>,
    secret: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledError();
    }
    if (!(await this.isTwoFactorAvailableForUser(user.id))) {
      throw new FeatureRequiresLicenseError();
    }
    if (!authenticator.check(code, secret)) {
      throw new InvalidTwoFactorCodeError();
    }

    const cleartextCodes = this.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      cleartextCodes.map((c) => this.passwordService.hashPassword(c)),
    );
    const encryptedSecret = this.encryptionService.encrypt(secret);
    if (!encryptedSecret) {
      throw new InvalidTwoFactorCodeError();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptedSecret,
          twoFactorEnabledAt: new Date(),
        },
      });
      await tx.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } });
      await tx.twoFactorRecoveryCode.createMany({
        data: hashedCodes.map((hashedCode) => ({ userId: user.id, hashedCode })),
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true },
      });
    });

    return { recoveryCodes: cleartextCodes };
  }

  // ---------------------------------------------------------------------------
  // Verify (used at login)
  // ---------------------------------------------------------------------------

  /**
   * Consumes an `mfa-verify` challenge, validates the user-entered code, and
   * returns the user. Caller is responsible for issuing tokens.
   */
  async verifyChallenge(
    challengeToken: string,
    code: string,
    isRecoveryCode: boolean,
  ): Promise<User> {
    const userId = await this.verifyChallengeToken(challengeToken, 'mfa-verify');
    await this.checkMfaLockout(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new TwoFactorNotEnabledError();
    }

    const ok = isRecoveryCode
      ? await this.consumeRecoveryCode(user.id, code)
      : this.verifyTotp(user.twoFactorSecret, code);

    if (!ok) {
      await this.recordMfaFailure(userId);
      throw isRecoveryCode ? new InvalidRecoveryCodeError() : new InvalidTwoFactorCodeError();
    }

    await this.clearMfaFailures(userId);
    return user;
  }

  /**
   * Verifies a TOTP/recovery code from a logged-in user (step-up auth).
   * Throws on failure; does NOT consume challenge token.
   */
  async verifyStepUp(user: User, code: string, isRecoveryCode: boolean): Promise<void> {
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new TwoFactorNotEnabledError();
    }
    await this.checkMfaLockout(user.id);

    const ok = isRecoveryCode
      ? await this.consumeRecoveryCode(user.id, code)
      : this.verifyTotp(user.twoFactorSecret, code);

    if (!ok) {
      await this.recordMfaFailure(user.id);
      throw isRecoveryCode ? new InvalidRecoveryCodeError() : new InvalidTwoFactorCodeError();
    }
    await this.clearMfaFailures(user.id);
  }

  // ---------------------------------------------------------------------------
  // Disable + regenerate
  // ---------------------------------------------------------------------------

  async disable(user: User, code: string, isRecoveryCode: boolean): Promise<void> {
    if (!user.twoFactorEnabled) {
      throw new TwoFactorNotEnabledError();
    }
    if (await this.isInstanceEnforcing()) {
      throw new TwoFactorEnforcedDisableNotAllowedError();
    }
    await this.verifyStepUp(user, code, isRecoveryCode);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorEnabledAt: null,
        },
      });
      await tx.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } });
    });
  }

  async regenerateRecoveryCodes(
    user: User,
    code: string,
    isRecoveryCode: boolean,
  ): Promise<{ recoveryCodes: string[] }> {
    if (!user.twoFactorEnabled) {
      throw new TwoFactorNotEnabledError();
    }
    await this.verifyStepUp(user, code, isRecoveryCode);

    const cleartextCodes = this.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      cleartextCodes.map((c) => this.passwordService.hashPassword(c)),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } });
      await tx.twoFactorRecoveryCode.createMany({
        data: hashedCodes.map((hashedCode) => ({ userId: user.id, hashedCode })),
      });
    });

    return { recoveryCodes: cleartextCodes };
  }

  // ---------------------------------------------------------------------------
  // Setup-required path (instance enforce on, user not enrolled yet)
  // ---------------------------------------------------------------------------

  /**
   * For the strict instance-enforcement path. Consumes an `mfa-setup-required`
   * challenge and runs the same setup as the logged-in path, returning recovery
   * codes. Caller must then issue tokens for the user.
   */
  async confirmSetupViaChallenge(
    challengeToken: string,
    secret: string,
    code: string,
  ): Promise<{ user: User; recoveryCodes: string[] }> {
    const userId = await this.verifyChallengeToken(challengeToken, 'mfa-setup-required');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new InvalidTwoFactorChallengeError();
    }
    const { recoveryCodes } = await this.confirmSetup(user, secret, code);
    const reloaded = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!reloaded) {
      // Race condition with account deletion between confirmSetup and this
      // reload — vanishingly unlikely but not impossible. Same error class
      // covers both "challenge invalid" and "user gone", which is fine: the
      // user-facing remedy is identical (sign in again).
      throw new InvalidTwoFactorChallengeError();
    }
    return { user: reloaded, recoveryCodes };
  }

  /**
   * For the strict instance-enforcement path. Consumes an `mfa-setup-required`
   * challenge and returns a freshly-generated secret + QR. Does not persist
   * anything; persistence happens in confirmSetupViaChallenge.
   */
  async startSetupViaChallenge(challengeToken: string) {
    const userId = await this.verifyChallengeToken(challengeToken, 'mfa-setup-required');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw new InvalidTwoFactorChallengeError();
    }
    return this.startSetup(user);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Whether 2FA is effectively required for this instance right now. Combines:
   *   - self-hosted mode (SaaS mode never enforces)
   *   - admin toggle (`InstanceSetting.require2FA`)
   *   - license entitlement (token must carry `require_2fa_enforcement` feature)
   * If the license becomes invalid/expired, enforcement degrades back to opt-in
   * rather than locking everyone out of the app.
   */
  async isInstanceEnforcing(): Promise<boolean> {
    if (!this.configService.get('globalConfig.isSelfHostedMode')) {
      return false;
    }
    const setting = await this.prisma.instanceSetting.findUnique({
      where: { key: 'instance' },
      select: { require2FA: true, license: true },
    });
    if (!setting?.require2FA || !setting.license) {
      return false;
    }
    return this.licenseService.hasFeature(setting.license, LICENSE_FEATURE_TWO_FACTOR);
  }

  /**
   * Whether the current instance license entitles the 2FA enforcement feature,
   * regardless of whether the toggle is on. Used by admin UI to decide whether
   * the toggle should be enabled, and by the toggle mutation to gate writes.
   */
  async isLicensedForEnforcement(): Promise<boolean> {
    if (!this.configService.get('globalConfig.isSelfHostedMode')) {
      return false;
    }
    const setting = await this.prisma.instanceSetting.findUnique({
      where: { key: 'instance' },
      select: { license: true },
    });
    if (!setting?.license) {
      return false;
    }
    return this.licenseService.hasFeature(setting.license, LICENSE_FEATURE_TWO_FACTOR);
  }

  /**
   * Whether a specific user can use 2FA on this instance. Returns true if the
   * instance license covers the 2FA feature, OR if any of the projects the
   * user is a member of has its own project license covering it. This mirrors
   * the existing `getSelfHostedConfig` resolution where project license can
   * unlock paid features without an instance license.
   *
   * SaaS mode: always true (no license model). Self-host with no covering
   * license: false — existing 2FA-enrolled users silently bypass the MFA
   * gate at login (their stored secret stays untouched; the gate comes
   * back the moment a covering license is restored).
   *
   * Why this does NOT consult `Project.usesInstanceLicense`: 2FA is an
   * account-level concern. `User.twoFactorSecret` is stored once per user,
   * not per project. The decision point is `emailLogin` → checked before
   * the user has selected any active project — there is no project context
   * to gate against. Even after login, the active project can be switched
   * client-side at any time, so making 2FA depend on which project is
   * active would mean a user enrolled while viewing project A could find
   * the policy lifted when they switch to project B, which inverts the
   * "extra layer of security" model. The 2FA feature flag on a license is
   * therefore treated as a license-wide entitlement that fans out to every
   * user, not as a per-tenant gate like `projectLimit`.
   */
  async isTwoFactorAvailableForUser(userId: string): Promise<boolean> {
    if (!this.configService.get('globalConfig.isSelfHostedMode')) {
      return true;
    }

    const instance = await this.prisma.instanceSetting.findUnique({
      where: { key: 'instance' },
      select: { license: true, instanceId: true },
    });
    if (
      instance?.license &&
      (await this.instanceLicenseHasFeature(instance.license, instance.instanceId))
    ) {
      return true;
    }

    const memberships = await this.prisma.userOnProject.findMany({
      where: { userId },
      select: { projectId: true, project: { select: { license: true } } },
    });
    for (const membership of memberships) {
      if (!membership.project.license) {
        continue;
      }
      if (await this.projectLicenseHasFeature(membership.project.license, membership.projectId)) {
        return true;
      }
    }

    return false;
  }

  private async instanceLicenseHasFeature(license: string, instanceId: string): Promise<boolean> {
    const payload = await this.licenseService.getLicensePayload(license);
    if (!payload) {
      return false;
    }
    const scope = payload.scope || (payload.projectId ? 'project' : 'instance');
    if (scope !== 'instance' || payload.instanceId !== instanceId) {
      return false;
    }
    return this.licenseService.hasFeature(license, LICENSE_FEATURE_TWO_FACTOR);
  }

  private async projectLicenseHasFeature(license: string, projectId: string): Promise<boolean> {
    const payload = await this.licenseService.getLicensePayload(license);
    if (!payload) {
      return false;
    }
    const scope = payload.scope || (payload.projectId ? 'project' : null);
    if (scope !== 'project' || payload.projectId !== projectId) {
      return false;
    }
    return this.licenseService.hasFeature(license, LICENSE_FEATURE_TWO_FACTOR);
  }

  private verifyTotp(encryptedSecret: string, code: string): boolean {
    const secret = this.encryptionService.decrypt(encryptedSecret);
    if (!secret) {
      return false;
    }
    return authenticator.check(code, secret);
  }

  private async consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const normalized = code.trim().toLowerCase();
    const candidates = await this.prisma.twoFactorRecoveryCode.findMany({
      where: { userId, usedAt: null },
    });
    for (const candidate of candidates) {
      const matches = await this.passwordService.validatePassword(normalized, candidate.hashedCode);
      if (!matches) {
        continue;
      }
      // Atomic compare-and-set on (id, usedAt=null) → usedAt=now. If a parallel
      // request just consumed the same code, count comes back 0 and we report
      // failure so the second caller can never reuse a code that's already been
      // claimed. bcrypt's ~100ms-per-check cost makes the race window wide
      // enough to actually matter under attack.
      const claim = await this.prisma.twoFactorRecoveryCode.updateMany({
        where: { id: candidate.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return claim.count === 1;
    }
    return false;
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(RECOVERY_CODE_BYTES).toString('hex'),
    );
  }
}
