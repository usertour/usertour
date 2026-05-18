import compileEmailTemplate from '@/common/email/compile-email-template';
import {
  getDefaultSegments,
  initialization,
  initializationThemes,
} from '@/common/initialization/initialization';
import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { SignupInput } from './dto/signup.input';
import { Common } from './models/common.model';
import { Profile } from 'passport-google-oauth20';
import { CookieOptions, Response } from 'express';
import { AuthResult, TokenData } from './dto/auth.dto';
import { PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';
import { createTransport } from 'nodemailer';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, UID_COOKIE } from '@/utils/cookie';
import { omit } from '@/utils/typesafe';
import ms from 'ms';
import {
  AccountNotFoundError,
  AuthenticationExpiredError,
  BaseError,
  EmailAlreadyRegistered,
  InvalidVerificationSession,
  OAuthError,
  OAuthOnlyAccountError,
  PasswordIncorrect,
  TooManyLoginAttemptsError,
  UnknownError,
  UserDisabledError,
  UserRegistrationDisabledError,
  SystemAdminAlreadyInitializedError,
  SystemAdminSetupRequiredError,
  SystemAdminSetupUnavailableError,
  WrongInviteAccountError,
} from '@/common/errors';
import { TeamService } from '@/team/team.service';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';
import {
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
  QUEUE_INITIALIZE_PROJECT,
} from '@/common/consts/queen';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisService, LockReleaseFn } from '@/shared/redis.service';

const EMAIL_COOLDOWN_MS = 60 * 1000; // 60 seconds - minimum interval between email sends
const EMAIL_COOLDOWN_SECONDS = EMAIL_COOLDOWN_MS / 1000;
const REGISTER_REUSE_WINDOW_MS = 60 * 60 * 1000; // 1 hour — caps the window a leaked magic link can be reused
const EMAIL_LOCK_KEY_PREFIX = 'magic-link-email:';
const RESET_EMAIL_COOLDOWN_KEY_PREFIX = 'reset-email-cooldown:';
const SETUP_SYSTEM_ADMIN_LOCK_KEY = 'setup-system-admin';
const PASSWORD_LOCKOUT_WINDOW_SECONDS = 10 * 60; // 10 minutes
const PASSWORD_MAX_FAILED_ATTEMPTS = 10;
const PASSWORD_FAILURE_KEY_PREFIX = 'login-failure:password:';
const RESET_CODE_TTL_MS = 60 * 60 * 1000; // 1 hour — matches Google / Stripe / GitHub conventions

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  // Lazily computed argon2 hash used by `emailLogin` to burn equivalent CPU
  // on a username-miss as on a real password verify. Without it, the
  // response time of "no such user" is meaningfully faster than "wrong
  // password" and an attacker can enumerate registered emails.
  private dummyPasswordHash: Promise<string> | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly teamService: TeamService,
    private readonly redisService: RedisService,
    private readonly twoFactorService: TwoFactorService,
    @InjectQueue(QUEUE_SEND_MAGIC_LINK_EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_SEND_RESET_PASSWORD_EMAIL) private resetPasswordQueue: Queue,
    @InjectQueue(QUEUE_INITIALIZE_PROJECT) private initializeProjectQueue: Queue,
  ) {}

  async isUserRegistrationAllowed() {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
    if (!isSelfHostedMode) {
      return true;
    }

    const setting = await this.prisma.instanceSetting.findUnique({
      where: { key: 'instance' },
      select: { allowUserRegistration: true },
    });

    return setting?.allowUserRegistration ?? true;
  }

  async needsSystemAdminSetup() {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
    if (!isSelfHostedMode) {
      return false;
    }

    const user = await this.prisma.user.findFirst({
      select: { id: true },
    });

    return !user;
  }

  private async ensureUserRegistrationAllowed() {
    if (await this.needsSystemAdminSetup()) {
      throw new SystemAdminSetupRequiredError();
    }

    const allowUserRegistration = await this.isUserRegistrationAllowed();
    if (!allowUserRegistration) {
      throw new UserRegistrationDisabledError();
    }
  }

  private async ensureSystemAdminSetupAvailable() {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
    if (!isSelfHostedMode) {
      throw new SystemAdminSetupUnavailableError();
    }

    if (!(await this.needsSystemAdminSetup())) {
      throw new SystemAdminAlreadyInitializedError();
    }
  }

  cookieOptions(key: string): CookieOptions {
    const baseOptions: CookieOptions = {
      secure: this.configService.get('auth.cookie.secure'),
      sameSite: 'strict',
      path: '/',
    };

    if (this.configService.get('auth.cookie.domain')) {
      baseOptions.domain = this.configService.get('auth.cookie.domain');
    }

    switch (key) {
      case UID_COOKIE:
        return {
          ...baseOptions,
          expires: new Date(Date.now() + ms(this.configService.get('auth.jwt.refreshExpiresIn'))),
        };
      case ACCESS_TOKEN_COOKIE:
        return {
          ...baseOptions,
          httpOnly: true,
          expires: new Date(Date.now() + ms(this.configService.get('auth.jwt.expiresIn'))),
        };
      case REFRESH_TOKEN_COOKIE:
        return {
          ...baseOptions,
          httpOnly: true,
          expires: new Date(Date.now() + ms(this.configService.get('auth.jwt.refreshExpiresIn'))),
        };
      default:
        return baseOptions;
    }
  }

  setAuthCookie(res: Response, { uid, accessToken, refreshToken }: TokenData) {
    return res
      .cookie(UID_COOKIE, uid, this.cookieOptions(UID_COOKIE))
      .cookie(ACCESS_TOKEN_COOKIE, accessToken, this.cookieOptions(ACCESS_TOKEN_COOKIE))
      .cookie(REFRESH_TOKEN_COOKIE, refreshToken, this.cookieOptions(REFRESH_TOKEN_COOKIE));
  }

  clearAuthCookie(res: Response) {
    const clearOptions = omit(this.cookieOptions(UID_COOKIE), ['expires']);

    return res
      .clearCookie(UID_COOKIE, clearOptions)
      .clearCookie(ACCESS_TOKEN_COOKIE, clearOptions)
      .clearCookie(REFRESH_TOKEN_COOKIE, clearOptions);
  }

  async oauthValidate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    inviteCode?: string,
  ) {
    const { provider, id, emails, displayName, photos } = profile;
    this.logger.log(`oauth validate provider=${provider}, providerId=${id}`);

    // Check if there is an authentication account record
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: id,
        },
      },
    });

    // If there is an authentication account record and corresponding user, return directly
    if (account) {
      this.logger.log(`account found for provider ${provider}, account id: ${id}`);
      const user = await this.prisma.user.findUnique({
        where: { id: account.userId },
      });
      if (user) {
        // inviteCode is not empty, join project
        if (inviteCode) {
          await this.joinProject(inviteCode, user.id);
        }
        return user;
      }

      this.logger.log(
        `user ${account.userId} not found for provider ${provider} account id: ${id}`,
      );
    }

    // oauth profile returns no email, this is invalid
    if (emails?.length === 0) {
      this.logger.warn('emails is empty, invalid oauth');
      throw new OAuthError();
    }
    const email = emails[0].value;
    // Reject if the provider explicitly says the email is not verified.
    // Some providers (Google OIDC) always set this; some (GitHub primary)
    // imply it; some (custom OIDC) may surface unverified mailboxes. Without
    // this gate, an attacker who can register an unverified email on a
    // provider could OAuth-log-in as the matching local user.
    const verifiedFlag = emails[0].verified as boolean | string | undefined;
    if (verifiedFlag === false || verifiedFlag === 'false') {
      this.logger.warn(`OAuth email not verified for ${provider} email=${email}`);
      throw new OAuthError();
    }

    // Return user if this email has been registered
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      this.logger.log(`user ${user.id} already registered for email ${email}`);
      // inviteCode is not empty, join project
      if (inviteCode) {
        await this.joinProject(inviteCode, user.id);
      }
      return user;
    }

    if (!inviteCode) {
      await this.ensureUserRegistrationAllowed();
    }

    // Email-bind the invite before creating anything. The OAuth profile email
    // is the new user's identity, and an invite addressed to someone else
    // must not be silently consumed by this OAuth signup.
    if (inviteCode) {
      const invite = await this.teamService.getValidInviteByCode(inviteCode);
      if (!invite) {
        throw new InvalidVerificationSession();
      }
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw new WrongInviteAccountError();
      }
    }

    // download avatar if profile photo exists
    let avatar: string;
    try {
      if (photos?.length > 0) {
        // avatar = (await this.miscService.dumpFileFromURL({ uid }, photos[0].value)).url;
      }
    } catch (e) {
      this.logger.warn(`failed to download avatar: ${e}`);
    }

    return await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: displayName || email,
          email,
          avatarUrl: avatar,
          emailVerified: new Date(),
          isSystemAdmin: false,
        },
      });

      this.logger.log(`user created: ${newUser.id}`);

      const newAccount = await tx.account.create({
        data: {
          type: 'oauth',
          userId: newUser.id,
          provider,
          providerAccountId: id,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      });
      this.logger.log(`new account created for ${newAccount.id}`);

      // inviteCode is not empty, join project. Delete the invite row before
      // assignUserToProject so the seat-limit recheck inside that call does
      // not double-count this very invite as still "pending".
      if (inviteCode) {
        const invite = await this.teamService.getValidInviteByCode(inviteCode);
        if (invite) {
          await this.teamService.deleteInvite(tx, inviteCode);
          await this.teamService.assignUserToProject(tx, newUser.id, invite.projectId, invite.role);
        }
      } else {
        const project = await this.createProject(tx, 'Unnamed Project', newUser.id);
        await initialization(tx, project.id);
      }

      return newUser;
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const jti = randomBytes(32).toString('hex');

    // Create a standard JWT refresh token
    const refreshToken = this.jwtService.sign(
      {
        userId,
        jti,
        tokenType: 'refresh',
      },
      {
        secret: this.configService.get('auth.jwt.refreshSecret'),
        expiresIn: this.configService.get('auth.jwt.refreshExpiresIn'),
      },
    );

    // Store token metadata in database for revocation support
    await this.prisma.refreshToken.create({
      data: {
        jti,
        userId,
        hashedToken: refreshToken,
        expiresAt: new Date(Date.now() + ms(this.configService.get('auth.jwt.refreshExpiresIn'))),
      },
    });

    return refreshToken;
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('auth.jwt.refreshSecret'),
      });

      // Check if token has been revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { jti: payload.jti },
      });

      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        throw new AuthenticationExpiredError();
      }

      // Revoke the current refresh token (one-time use)
      await this.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { revoked: true },
      });

      // Generate new tokens
      return this.login(payload.userId);
    } catch (_) {
      throw new AuthenticationExpiredError();
    }
  }

  async login(userId: string): Promise<TokenData> {
    const payload = { userId };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('auth.jwt.secret'),
      expiresIn: this.configService.get('auth.jwt.expiresIn'),
    });

    // Generate refresh token
    const refreshToken = await this.generateRefreshToken(userId);

    return {
      uid: userId,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Branches on the user's 2FA state and the instance enforcement flag:
   *   - user has 2FA enabled       → issue an `mfa-verify` challenge
   *   - instance enforces + not on → issue an `mfa-setup-required` challenge
   *   - otherwise                  → issue real access/refresh tokens
   * Callers (login/signup/oauth) must NOT setAuthCookie when kind === 'challenge'.
   */
  async issueTokensOrChallenge(userId: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw new AccountNotFoundError();
    }

    // If 2FA is unavailable (self-host + missing/invalid license, considering
    // both instance license and any of the user's project licenses), drop the
    // MFA gate entirely — even for users with twoFactorEnabled=true. Their
    // stored secret stays untouched; if a covering license is restored, they're
    // immediately challenged again. This matches the "all-or-nothing" product
    // decision we made for license lapse behavior.
    const twoFactorAvailable = await this.twoFactorService.isTwoFactorAvailableForUser(user.id);

    if (twoFactorAvailable && user.twoFactorEnabled) {
      const challengeToken = this.twoFactorService.signChallengeToken(user.id, 'mfa-verify');
      return { kind: 'challenge', purpose: 'mfa-verify', challengeToken };
    }

    if (twoFactorAvailable && (await this.twoFactorService.isInstanceEnforcing())) {
      const challengeToken = this.twoFactorService.signChallengeToken(
        user.id,
        'mfa-setup-required',
      );
      return { kind: 'challenge', purpose: 'mfa-setup-required', challengeToken };
    }

    const tokens = await this.login(userId);
    return { kind: 'tokens', tokens };
  }

  async revokeAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  /**
   * Update user password and revoke all refresh tokens in a single transaction
   * @param userId - The user ID
   * @param newPassword - The new plain text password
   * @returns The updated user
   */
  async updatePasswordAndRevokeTokens(userId: string, newPassword: string) {
    const hashedPassword = await this.passwordService.hashPassword(newPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        data: { password: hashedPassword },
        where: { id: userId },
      });

      // Revoke all existing refresh tokens after password change
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });

      return user;
    });
  }

  async createMagicLink(email: string) {
    await this.ensureUserRegistrationAllowed();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      throw new EmailAlreadyRegistered();
    }

    try {
      // Check if there's a recent Register record for this email (within reuse window)
      const existingRegister = await this.prisma.register.findFirst({
        where: {
          email,
          createdAt: {
            gte: new Date(Date.now() - REGISTER_REUSE_WINDOW_MS),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // If a recent record exists, reuse it and trigger email job
      if (existingRegister) {
        this.logger.log(`Reusing existing register record for email: ${email}`);
        await this.addSendMagicLinkEmailJob(existingRegister.id);
        return existingRegister;
      }

      // Create new record if no recent one exists
      const result = await this.prisma.register.create({
        data: {
          email,
          processed: false,
        },
      });
      await this.addSendMagicLinkEmailJob(result.id);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create magic link for email: ${email}`, error);
      throw new UnknownError();
    }
  }

  async resendMargicLink(id: string) {
    await this.ensureUserRegistrationAllowed();

    const data = await this.prisma.register.findUnique({ where: { id } });
    if (!data) {
      throw new InvalidVerificationSession();
    }

    try {
      await this.addSendMagicLinkEmailJob(data.id);
      return data;
    } catch (error) {
      this.logger.error(`Failed to resend magic link for registerId: ${id}`, error);
      throw new UnknownError();
    }
  }

  async sendResetPasswordEmailBySessionId(sessionId: string) {
    const data = await this.prisma.code.findUnique({ where: { id: sessionId } });
    if (!data) {
      throw new InvalidVerificationSession();
    }
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) {
      throw new AccountNotFoundError();
    }
    await this.sendResetPasswordEmail(sessionId, user.email, user.name);
  }

  async addSendResetPasswordEmailJob(sessionId: string) {
    await this.resetPasswordQueue.add('sendResetPasswordEmail', { sessionId });
  }

  async processMagicLinkEmail(sessionId: string) {
    const current = await this.prisma.register.findUnique({ where: { id: sessionId } });
    if (!current) {
      throw new InvalidVerificationSession();
    }

    // Acquire distributed lock to prevent concurrent email sending for the same email
    const emailHash = createHash('md5').update(current.email).digest('hex');
    const lockKey = `${EMAIL_LOCK_KEY_PREFIX}${emailHash}`;
    let releaseLock: LockReleaseFn | null = null;

    try {
      releaseLock = await this.redisService.acquireLock(lockKey);
      if (!releaseLock) {
        this.logger.warn(
          `Could not acquire lock for ${current.email}, another instance is processing`,
        );
        return;
      }

      // Get the last record where email was actually sent (processed=true means email was sent)
      const lastEmailSent = await this.prisma.register.findFirst({
        where: {
          email: current.email,
          processed: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Check cooldown based on last actual email send time
      if (lastEmailSent) {
        const interval = Date.now() - lastEmailSent.updatedAt.getTime();
        if (interval < EMAIL_COOLDOWN_MS) {
          this.logger.warn(
            `Skipping email for ${current.email}, interval: ${interval}ms < ${EMAIL_COOLDOWN_MS}ms`,
          );
          // Don't mark as processed - only sent emails count toward cooldown
          return;
        }
      }

      // Send email and mark as processed (processed=true means email was sent)
      await this.sendMagicLinkEmail(current.code, current.email);
      await this.prisma.register.update({ where: { id: sessionId }, data: { processed: true } });
      this.logger.log(`Magic link email sent for ${current.email}`);
    } finally {
      // Always release the lock
      if (releaseLock) {
        await releaseLock();
      }
    }
  }

  async addSendMagicLinkEmailJob(sessionId: string) {
    await this.emailQueue.add('sendMagicLinkEmail', { sessionId });
  }

  async initializeProject(projectId: string) {
    await initialization(this.prisma, projectId);
  }

  async addInitializeProjectJob(projectId: string) {
    await this.initializeProjectQueue.add('initializeProject', { projectId });
  }

  async signup(payload: SignupInput): Promise<AuthResult> {
    const { code, userName, companyName, password, isInvite } = payload;

    if (!isInvite) {
      await this.ensureUserRegistrationAllowed();
    }

    // Validate verification code
    const { email, projectId, role } = await this.validateSignupCode(code, isInvite);

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Create user and account
        const user = await this.createUser(tx, userName, email, hashedPassword);
        await this.createAccount(tx, 'email', user.id, 'email', email);

        // Handle project assignment. Delete the invite before
        // assignUserToProject so the seat-limit recheck inside that call
        // does not double-count this very invite as still "pending".
        if (isInvite) {
          await this.teamService.deleteInvite(tx, code);
          await this.teamService.assignUserToProject(tx, user.id, projectId, role);
        } else {
          const project = await this.createProject(tx, companyName, user.id);
          await initialization(tx, project.id);
          // Consume the magic-link Register row so the same code can't be
          // re-used for a second signup attempt before its TTL window closes.
          await tx.register.deleteMany({ where: { code } });
        }

        return user;
      });

      this.logger.log(`User ${user.id} created`);
      return this.issueTokensOrChallenge(user.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new EmailAlreadyRegistered();
      }
      // Domain errors thrown inside the tx (e.g. InviteSeatExhaustedError,
      // WrongInviteAccountError) carry meaningful client-facing messages;
      // collapsing them to UnknownError would strip the explanation the
      // user needs to recover.
      if (e instanceof BaseError) {
        throw e;
      }
      this.logger.error('Failed to signup user', e);
      throw new UnknownError();
    }
  }

  async setupSystemAdmin(name: string, email: string, password: string): Promise<AuthResult> {
    await this.ensureSystemAdminSetupAvailable();

    const hashedPassword = await this.passwordService.hashPassword(password);
    let releaseLock: LockReleaseFn | null = null;

    try {
      releaseLock = await this.redisService.acquireLock(SETUP_SYSTEM_ADMIN_LOCK_KEY);
      if (!releaseLock) {
        throw new SystemAdminAlreadyInitializedError();
      }

      await this.ensureSystemAdminSetupAvailable();

      const user = await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findFirst({
          where: { isSystemAdmin: true },
          select: { id: true },
        });

        if (existingUser) {
          throw new SystemAdminAlreadyInitializedError();
        }

        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            isSystemAdmin: true,
          },
        });

        await this.createAccount(tx, 'email', user.id, 'email', email);
        const project = await this.createProject(tx, 'Unnamed Project', user.id);
        await initialization(tx, project.id);

        return user;
      });

      this.logger.log(`System admin ${user.id} initialized`);
      // issueTokensOrChallenge has two branches (mfa-verify, mfa-setup-required)
      // that cannot fire here: this user was just created (twoFactorEnabled
      // starts false) and the require2FA instance toggle has no path to be on
      // before the first admin exists — only an admin can flip it. Going
      // through the dispatcher anyway keeps every "user successfully
      // authenticated, now hand them tokens" entry point on one shape.
      return this.issueTokensOrChallenge(user.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new EmailAlreadyRegistered();
      }

      if (
        e instanceof SystemAdminAlreadyInitializedError ||
        e instanceof SystemAdminSetupRequiredError ||
        e instanceof SystemAdminSetupUnavailableError
      ) {
        throw e;
      }

      this.logger.error('Failed to set up system admin', e);
      throw new UnknownError();
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  }

  // Add new helper methods
  private async validateSignupCode(code: string, isInvite: boolean) {
    const register = !isInvite
      ? await this.prisma.register.findFirst({
          where: {
            code,
            createdAt: {
              gte: new Date(Date.now() - REGISTER_REUSE_WINDOW_MS), // Magic link expires after 24 hours
            },
          },
        })
      : null;

    const invite = isInvite ? await this.teamService.getValidInviteByCode(code) : null;

    if (!register && !invite) {
      throw new InvalidVerificationSession();
    }

    return {
      email: register?.email || invite?.email,
      projectId: invite?.projectId,
      role: invite?.role,
    };
  }

  private passwordFailureKey(email: string) {
    return `${PASSWORD_FAILURE_KEY_PREFIX}${email}`;
  }

  private async checkPasswordLockout(email: string) {
    const raw = await this.redisService.get(this.passwordFailureKey(email));
    if (raw && Number(raw) >= PASSWORD_MAX_FAILED_ATTEMPTS) {
      throw new TooManyLoginAttemptsError();
    }
  }

  private async recordPasswordFailure(email: string) {
    await this.redisService.incrWithExpire(
      this.passwordFailureKey(email),
      PASSWORD_LOCKOUT_WINDOW_SECONDS,
    );
  }

  private async clearPasswordFailures(email: string) {
    await this.redisService.del(this.passwordFailureKey(email));
  }

  private getDummyPasswordHash() {
    if (!this.dummyPasswordHash) {
      this.dummyPasswordHash = this.passwordService.hashPassword(
        'dummy-password-for-timing-equalization',
      );
    }
    return this.dummyPasswordHash;
  }

  async emailLogin(email: string, password: string, inviteCode?: string): Promise<AuthResult> {
    await this.checkPasswordLockout(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { projects: true, accounts: true },
    });

    if (!user) {
      // Burn argon2 CPU equivalent to a real verify so this branch is
      // indistinguishable from "wrong password" by response time.
      await this.passwordService.validatePassword(password, await this.getDummyPasswordHash());
      await this.recordPasswordFailure(email);
      throw new AccountNotFoundError();
    }

    if (user.disabled) {
      throw new UserDisabledError();
    }

    if (user.accounts.length === 0) {
      await this.recordPasswordFailure(email);
      throw new AccountNotFoundError();
    }

    // OAuth-only account (no local password). argon2.verify would throw on
    // null and surface as a 500 + bypass the lockout counter.
    if (!user.password) {
      throw new OAuthOnlyAccountError();
    }

    const passwordValid = await this.passwordService.validatePassword(password, user.password);

    if (!passwordValid) {
      await this.recordPasswordFailure(email);
      throw new PasswordIncorrect();
    }

    await this.clearPasswordFailures(email);

    // State-mutating side effects only run after the password is proven.
    // Otherwise a wrong-password attempt could consume an invite, reshuffle
    // active project, or create an orphan project for any known email.
    if (user.projects.length === 0) {
      const project = await this.createProject(this.prisma, 'Unnamed Project', user.id);
      await initialization(this.prisma, project.id);
    }

    if (inviteCode) {
      await this.joinProject(inviteCode, user.id);
    }

    return this.issueTokensOrChallenge(user.id);
  }

  async resetUserPassword(email: string): Promise<Common> {
    // Always return success regardless of account existence to avoid
    // letting an unauthenticated caller probe which emails are registered.
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.log(`Reset password requested for unknown email: ${email}`);
      return { success: true };
    }

    // OAuth-only accounts have no local password — issuing a reset code
    // would turn this endpoint into a silent "claim a password" path against
    // an account the requester may not actually own. Surface the friendly
    // error so the user understands why no email arrives (the UX cost of
    // staying silent is bigger than the marginal enumeration signal).
    if (!user.password) {
      throw new OAuthOnlyAccountError();
    }

    // 60s per-email cooldown. Atomic via incrWithExpire so a burst of
    // concurrent requests can't all blast emails. Gated at this layer
    // (not the queue processor) because `deleteMany` below would otherwise
    // invalidate the prior code without a replacement reaching the user.
    const emailHash = createHash('md5').update(email).digest('hex');
    const cooldownKey = `${RESET_EMAIL_COOLDOWN_KEY_PREFIX}${emailHash}`;
    const hits = await this.redisService.incrWithExpire(cooldownKey, EMAIL_COOLDOWN_SECONDS);
    if (hits > 1) {
      this.logger.warn(`Skipping reset email for ${email}: cooldown active`);
      return { success: true };
    }

    try {
      // Invalidate any prior outstanding codes for this user. If they
      // requested reset multiple times, only the latest link should work —
      // a user who clicked Forgot password three times shouldn't leave
      // three valid reset URLs in their inbox.
      await this.prisma.code.deleteMany({ where: { userId: user.id } });

      const result = await this.prisma.code.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
        },
      });
      await this.addSendResetPasswordEmailJob(result.id);
      return { success: true };
    } catch (_) {
      throw new UnknownError();
    }
  }

  async resetUserPasswordByCode(code: string, password: string): Promise<Common> {
    // Look up the row so we have userId for the password update. The actual
    // consume step below is a race-safe DELETE that re-checks expiresAt.
    const data = await this.prisma.code.findUnique({ where: { id: code } });
    if (!data) {
      throw new InvalidVerificationSession();
    }

    // Atomically consume: deleteMany with the expiresAt > now guard. Two
    // concurrent requests with the same code can't both succeed — the
    // second sees count === 0. Single-use is enforced by the row being
    // gone after consume; expiry is enforced inline.
    //
    // No per-IP rate limit here — the code is a CUID (~144 bits of entropy)
    // so brute-force is infeasible; req.ip in self-hosted deployments would
    // be unreliable without precise trust-proxy configuration; resource DoS
    // belongs at the edge, not at this endpoint.
    const consumed = await this.prisma.code.deleteMany({
      where: { id: code, expiresAt: { gt: new Date() } },
    });
    if (consumed.count === 0) {
      // Either expired or lost the race. Same error either way — avoids
      // leaking timing signal about which case the client hit.
      throw new InvalidVerificationSession();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      throw new AccountNotFoundError();
    }

    try {
      await this.updatePasswordAndRevokeTokens(user.id, password);
      await this.clearPasswordFailures(user.email);
      return { success: true };
    } catch (_) {
      throw new UnknownError();
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.disabled) {
      throw new UserDisabledError();
    }
    return user;
  }

  async getUserFromToken(token: string): Promise<User> {
    const { userId } = this.jwtService.decode(token);
    return await this.prisma.user.findUnique({ where: { id: userId } });
  }

  async sendEmail(data: unknown) {
    const transporter = createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: true,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
    });
    return await transporter.sendMail(data);
  }

  async sendMagicLinkEmail(code: string, email: string) {
    const link = `${this.configService.get('app.homepageUrl')}/auth/registration/${code}`;
    const template = await compileEmailTemplate({
      fileName: 'verifyEmail.mjml',
      data: {
        name: 'test',
        url: link,
      },
    });
    return await this.sendEmail({
      from: this.configService.get('auth.email.sender'), // sender address
      to: email, // list of receivers
      subject: 'Welcome to Usertour, verify your email', // Subject line
      html: template, // html body
    });
  }

  async sendResetPasswordEmail(id: string, email: string, name: string) {
    const link = `${this.configService.get('app.homepageUrl')}/auth/password-reset/${id}`;
    const template = await compileEmailTemplate({
      fileName: 'forgotPassword.mjml',
      data: {
        name,
        url: link,
      },
    });
    return await this.sendEmail({
      from: this.configService.get('auth.email.sender'), // sender address
      to: email, // list of receivers
      subject: 'Set up a new password for Usertour', // Subject line
      html: template, // html body
    });
  }

  async createUser(tx: Prisma.TransactionClient, name: string, email: string, password: string) {
    return await tx.user.create({
      data: {
        name,
        email,
        password,
        isSystemAdmin: false,
      },
    });
  }

  async createAccount(
    tx: Prisma.TransactionClient,
    type: string,
    userId: string,
    provider: string,
    providerAccountId: string,
  ) {
    await tx.account.create({
      data: {
        type,
        userId,
        provider,
        providerAccountId,
      },
    });
  }

  async createProject(tx: Prisma.TransactionClient, name: string, userId: string) {
    return await tx.project.create({
      data: {
        name,
        users: {
          create: [{ userId, role: RolesScopeEnum.OWNER, actived: true }],
        },
        segments: {
          create: getDefaultSegments(),
        },
        environments: {
          create: [
            {
              name: 'Production',
              isPrimary: true,
            },
          ],
        },
        themes: { create: [...initializationThemes] },
        localizations: {
          create: [
            {
              locale: 'en-US',
              name: 'English',
              code: 'en-US',
              isDefault: true,
            },
          ],
        },
      },
      include: {
        environments: true,
      },
    });
  }

  async joinProject(code: string, userId: string) {
    const invite = await this.teamService.getValidInviteByCode(code);
    if (!invite) {
      throw new InvalidVerificationSession();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { projects: true },
    });
    if (!user) {
      throw new AccountNotFoundError();
    }
    // The invite is a bearer token until accepted. Without this check,
    // anyone with the link can attach themselves to the target project.
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new WrongInviteAccountError();
    }
    const userOnProject = await this.teamService.getUserOnProject(userId, invite.projectId);
    if (userOnProject) {
      // Already a member — consume the invite anyway so it doesn't stay
      // pending in the admin's invite list and the link can't be reused.
      await this.teamService.deleteInvite(this.prisma, invite.code);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      if (user.projects.length > 0) {
        await this.teamService.cancelActiveProject(tx, userId);
      }
      // Delete the invite before assignUserToProject so the seat-limit
      // recheck inside that call does not double-count this very invite as
      // still "pending" — otherwise the last seat is unreachable.
      await this.teamService.deleteInvite(tx, invite.code);
      await this.teamService.assignUserToProject(tx, user.id, invite.projectId, invite.role);
    });
  }
}
