import compileEmailTemplate from '@/common/email/compile-email-template';
import {
  getDefaultSegments,
  initialization,
  initializationThemes,
} from '@/common/initialization/initialization';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { AcceptInviteInput } from './dto/accept-invite.input';
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
  ParamsError,
  PasswordIncorrect,
  SsoAccessDeniedError,
  SsoRequiredError,
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
import { ProjectsService } from '@/projects/projects.service';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';
import {
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
  QUEUE_INITIALIZE_PROJECT,
  QUEUE_CLEAN_EXPIRED_REFRESH_TOKENS,
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

// Project-level SSO provisioning policy resolved by the controller from
// ProjectSsoSettings and handed to ssoValidate.
interface SsoProvisionContext {
  projectId: string;
  autoProvision: boolean;
  defaultRole: string;
  allowedDomains: string[];
}
const RESET_CODE_TTL_MS = 60 * 60 * 1000; // 1 hour — matches Google / Stripe / GitHub conventions

/** Invite.allowedEnvironmentIds (JsonB) -> the membership restriction to copy on accept. */
const inviteEnvScope = (invite: { allowedEnvironmentIds?: unknown }): string[] | null =>
  Array.isArray(invite.allowedEnvironmentIds) ? (invite.allowedEnvironmentIds as string[]) : null;

@Injectable()
export class AuthService implements OnModuleInit {
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
    private readonly projectsService: ProjectsService,
    private readonly redisService: RedisService,
    private readonly twoFactorService: TwoFactorService,
    @InjectQueue(QUEUE_SEND_MAGIC_LINK_EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_SEND_RESET_PASSWORD_EMAIL) private resetPasswordQueue: Queue,
    @InjectQueue(QUEUE_INITIALIZE_PROJECT) private initializeProjectQueue: Queue,
    @InjectQueue(QUEUE_CLEAN_EXPIRED_REFRESH_TOKENS)
    private cleanExpiredRefreshTokensQueue: Queue,
  ) {}

  // Schedule the recurring refresh-token cleanup. Mirrors the subscription
  // cron pattern (BullMQ repeatable + fixed jobId so it fires once per cluster).
  // Scheduling failure must not block app boot — the sweep is non-critical
  // hygiene, not a correctness requirement.
  async onModuleInit() {
    try {
      await this.setupCleanExpiredRefreshTokensJob();
    } catch (error) {
      this.logger.error(`Failed to schedule refresh-token cleanup job: ${error}`);
    }
  }

  private async setupCleanExpiredRefreshTokensJob() {
    const existingJobs = await this.cleanExpiredRefreshTokensQueue.getJobSchedulers();
    await Promise.all(
      existingJobs.map((job) => this.cleanExpiredRefreshTokensQueue.removeJobScheduler(job.id)),
    );

    await this.cleanExpiredRefreshTokensQueue.add(
      'clean-expired-refresh-tokens',
      {},
      {
        repeat: { pattern: '0 3 * * *' }, // daily at 03:00
        jobId: 'clean-expired-refresh-tokens', // fixed id dedupes across instances
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  // Delete refresh-token rows whose natural expiry has passed. They can never
  // be exchanged again (refreshAccessToken's `expiresAt > now` filter rejects
  // them), so removing them is safe and keeps the table bounded.
  async cleanExpiredRefreshTokens() {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      this.logger.log(`Cleaned ${count} expired refresh tokens`);
    }
  }

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

  // Record the OAuth identity on the User row so future logins find the
  // account directly via (provider, providerAccountId) instead of falling
  // back to the email lookup. Also keeps `isOAuthUser` (which scans Account
  // for type='oauth') honest. Upsert is idempotent and refreshes the
  // upstream tokens if the row already exists.
  private async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    accessToken: string,
    refreshToken: string,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    await client.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { type: 'oauth', userId, provider, providerAccountId, accessToken, refreshToken },
      update: { accessToken, refreshToken },
    });
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
    // Canonicalise at the boundary. All other write paths (signup, invite,
    // magic link, system admin) already lowercase via their resolvers; this
    // is the one path that previously stored the OAuth provider's raw value
    // and could produce mixed-case `User.email` rows.
    const email = emails[0].value.toLowerCase().trim();
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
      await this.linkOAuthAccount(user.id, provider, id, accessToken, refreshToken);
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
          await this.teamService.assignUserToProject(
            tx,
            newUser.id,
            invite.projectId,
            invite.role,
            inviteEnvScope(invite),
          );
        }
      } else {
        const project = await this.createProject(tx, 'Unnamed Project', newUser.id);
        await initialization(tx, project.id);
      }

      return newUser;
    });
  }

  /**
   * Resolve the Usertour user for a project-level SSO (OIDC) login.
   *
   * Unlike oauthValidate (global social login), this is scoped to one project
   * and enforces the SSO safety rule: an existing global user is only admitted
   * if they are ALREADY a member of the target project. The IdP for project X
   * cannot mint a session for a user who does not belong to X — that would be
   * cross-tenant account takeover, since User.email is globally unique.
   *
   *   - existing SSO account (provider = oidc:<providerId>)  → return it
   *   - existing global user, member of the project          → link + return
   *   - existing global user / new email, with a pending invite → consume + join
   *   - existing global user, NOT a member, no invite        → reject
   *   - brand-new email, no invite, autoProvision on (domain-gated) → JIT
   *   - brand-new email, no invite, autoProvision off        → reject
   */
  async ssoValidate(
    profile: {
      provider: string;
      id: string;
      emails: { value: string; verified?: boolean | string }[];
      displayName?: string;
    },
    ssoContext: SsoProvisionContext,
  ) {
    const { provider, id, emails, displayName } = profile;

    // Existing identity on this exact provider connection. Being linked does NOT
    // by itself grant access — a user removed from the project still has this
    // account row — so re-check current project access before letting them in.
    const account = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: id } },
    });
    if (account) {
      const user = await this.prisma.user.findUnique({ where: { id: account.userId } });
      if (user) {
        return await this.ensureSsoProjectAccess(user, ssoContext, provider, id);
      }
    }

    if (!emails?.length) {
      throw new OAuthError();
    }
    const email = emails[0].value.toLowerCase().trim();
    // Reject when the IdP explicitly says the mailbox is unverified.
    const verifiedFlag = emails[0].verified;
    if (verifiedFlag === false || verifiedFlag === 'false') {
      this.logger.warn(`SSO email not verified for ${provider} email=${email}`);
      throw new OAuthError();
    }

    // Safe linking: an already-registered global user may only be linked if
    // they already belong to this project (or hold an invite). Otherwise this
    // IdP has no standing to authenticate them into it.
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return await this.ensureSsoProjectAccess(existingUser, ssoContext, provider, id);
    }

    // Brand-new email (no existing global user). The same join decision applies
    // as for existing non-members — invite / auto-provision / reject — only here
    // the user is created first.
    const invite = await this.teamService.getValidInviteForEmailAndProject(
      email,
      ssoContext.projectId,
    );
    const role = this.resolveSsoJoinRole(email, invite, ssoContext);

    return await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: displayName || email,
          email,
          emailVerified: new Date(),
          isSystemAdmin: false,
        },
      });
      await tx.account.create({
        data: { type: 'oauth', userId: newUser.id, provider, providerAccountId: id },
      });
      // Consume the invite before assignUserToProject so its seat re-check
      // does not count this very invite as still pending.
      if (invite) {
        await this.teamService.deleteInvite(tx, invite.code);
      }
      // assignUserToProject re-checks the seat limit inside the transaction.
      await this.teamService.assignUserToProject(tx, newUser.id, ssoContext.projectId, role);
      return newUser;
    });
  }

  // An existing usertour user (resolved by linked account or by email) must have
  // CURRENT access to the project they're signing in to. Member → link and let
  // in. Otherwise the same join decision as a brand-new email applies (invite /
  // auto-provision / reject) — so a removed user can't keep getting in just
  // because their SSO identity was linked once, but auto-provision still re-adds
  // them when the project opted in.
  private async ensureSsoProjectAccess(
    user: User,
    ssoContext: SsoProvisionContext,
    provider: string,
    providerAccountId: string,
  ): Promise<User> {
    const membership = await this.prisma.userOnProject.findFirst({
      where: { projectId: ssoContext.projectId, userId: user.id },
    });
    if (membership) {
      await this.linkOAuthAccount(user.id, provider, providerAccountId, '', '');
      return user;
    }

    const invite = await this.teamService.getValidInviteForEmailAndProject(
      user.email,
      ssoContext.projectId,
    );
    const role = this.resolveSsoJoinRole(user.email, invite, ssoContext);

    await this.prisma.$transaction(async (tx) => {
      // Delete the invite before assignUserToProject so its seat re-check does
      // not count this very invite as still pending.
      if (invite) {
        await this.teamService.deleteInvite(tx, invite.code);
      }
      // assignUserToProject only marks the new row active without deactivating
      // the others, so clear any prior active project first — otherwise an
      // existing user ends up with multiple active rows and lands unpredictably.
      await this.teamService.cancelActiveProject(tx, user.id);
      await this.teamService.assignUserToProject(tx, user.id, ssoContext.projectId, role);
      await this.linkOAuthAccount(user.id, provider, providerAccountId, '', '', tx);
    });
    return user;
  }

  // Decide the role a non-member joins with, or reject. An invite wins (its
  // role). Otherwise auto-provisioning must be on and the email-domain allow-list
  // (if any) must match. Shared by the existing-user and brand-new-email paths so
  // auto-provision applies consistently to both.
  private resolveSsoJoinRole(
    email: string,
    invite: { role: Role } | null,
    ssoContext: SsoProvisionContext,
  ): string {
    if (invite) {
      return invite.role;
    }
    if (!ssoContext.autoProvision) {
      this.logger.warn(
        `SSO rejected: ${email} has no invite and auto-provisioning is off for project ${ssoContext.projectId}`,
      );
      throw new SsoAccessDeniedError();
    }
    if (!this.isEmailDomainAllowed(email, ssoContext.allowedDomains)) {
      this.logger.warn(`SSO rejected: domain of ${email} not in allow-list`);
      throw new SsoAccessDeniedError();
    }
    return ssoContext.defaultRole;
  }

  // Empty allow-list = trust the IdP; otherwise the email's domain must match.
  private isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
    if (allowedDomains.length === 0) {
      return true;
    }
    const domain = email.split('@')[1];
    return !!domain && allowedDomains.includes(domain.toLowerCase());
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

      // One-time use: atomically consume the stored token by deleting it.
      // `count === 1` means the row existed and hadn't expired; anything else
      // (unknown jti, already-consumed, or expired) is treated as expired.
      // Deleting in a single statement also closes the race where two
      // concurrent refreshes both pass a separate read-then-update.
      //
      // `revoked: false` is transitional: rows the old code marked revoked
      // (logout / password change / 2FA / admin force, or a stolen rotated
      // token) were kept rather than deleted, so they could still match jti +
      // expiry and be re-honored once. Excluding them preserves the old
      // rejection. Drop this filter together with the `revoked` column once
      // every legacy revoked row has aged past its expiry.
      const { count } = await this.prisma.refreshToken.deleteMany({
        where: { jti: payload.jti, expiresAt: { gt: new Date() }, revoked: false },
      });
      if (count !== 1) {
        throw new AuthenticationExpiredError();
      }

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
  async issueTokensOrChallenge(userId: string, viaSso = false): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true, isSystemAdmin: true },
    });
    if (!user) {
      throw new AccountNotFoundError();
    }

    // Force-SSO: a non-SSO sign-in (password / social / magic-link) is rejected
    // when the user is a non-owner member of any project that enforces SSO.
    // System admins and project owners are exempt — break-glass so an IdP
    // outage cannot lock out the people who can fix it.
    if (!viaSso && !user.isSystemAdmin) {
      await this.assertNotSsoLocked(userId);
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

  // Throws SsoRequiredError when the user is a non-owner member of any project
  // that enforces SSO *and can still use it*. The indexed lookup returns nothing
  // for the vast majority of users (so no entitlement work runs); callers skip
  // this for system admins (see issueTokensOrChallenge). Carries the enforcing
  // project's id so the client can route to its SSO entry.
  private async assertNotSsoLocked(userId: string): Promise<void> {
    const enforced = await this.prisma.userOnProject.findMany({
      where: {
        userId,
        role: { not: Role.OWNER },
        project: { ssoSettings: { is: { requireSso: true } } },
      },
      select: { projectId: true },
    });
    for (const { projectId } of enforced) {
      // Mirror the 2FA "license lapse -> drop the gate" rule: if the project can
      // no longer use SSO (entitlement lapsed), its enforcement is inert.
      // Otherwise the member is locked out entirely — blocked here AND rejected
      // by the SSO flow's own entitlement check.
      const config = await this.projectsService.getProjectConfig(projectId);
      if (config.ssoOidc) {
        throw new SsoRequiredError(projectId);
      }
    }
  }

  // Revoke a single session's refresh token (per-device logout). The jti is
  // carried in the refresh JWT itself; verify to extract it, then delete that
  // one row. Deleting every token for a user belongs to an explicit
  // "log out all devices" action, not ordinary logout.
  async revokeRefreshToken(refreshToken: string) {
    let jti: string | undefined;
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('auth.jwt.refreshSecret'),
      });
      jti = payload?.jti;
    } catch {
      // Invalid or expired refresh token — already useless, nothing to delete.
      return;
    }
    if (jti) {
      await this.prisma.refreshToken.deleteMany({
        where: { jti },
      });
    }
  }

  /**
   * Update user password and delete all of the user's refresh tokens
   * (changing the password ends every session — "log out all devices").
   * Caller owns the transaction boundary — wrap this call in
   * `prisma.$transaction` to make it atomic with any surrounding work.
   */
  async updatePasswordAndRevokeTokens(
    tx: Prisma.TransactionClient,
    userId: string,
    newPassword: string,
  ) {
    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    const user = await tx.user.update({
      data: { password: hashedPassword },
      where: { id: userId },
    });
    await tx.refreshToken.deleteMany({
      where: { userId },
    });
    return user;
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
    await this.ensureUserRegistrationAllowed();

    const register = await this.prisma.register.findFirst({
      where: {
        code: payload.code,
        createdAt: { gte: new Date(Date.now() - REGISTER_REUSE_WINDOW_MS) },
      },
    });
    if (!register) {
      throw new InvalidVerificationSession();
    }

    return this.runSignupFlow(
      payload.userName,
      register.email,
      payload.password,
      async (tx, user) => {
        const project = await this.createProject(tx, payload.companyName, user.id);
        await initialization(tx, project.id);
        // Consume the magic-link Register row so the same code can't be
        // re-used for a second signup attempt before its TTL window closes.
        await tx.register.deleteMany({ where: { code: payload.code } });
      },
    );
  }

  async acceptInvite(payload: AcceptInviteInput): Promise<AuthResult> {
    const invite = await this.teamService.getValidInviteByCode(payload.code);
    if (!invite) {
      throw new InvalidVerificationSession();
    }

    return this.runSignupFlow(
      payload.userName,
      invite.email,
      payload.password,
      async (tx, user) => {
        // Delete invite before assignUserToProject so the seat-limit recheck
        // inside that call does not double-count this very invite as still
        // "pending" — otherwise the last seat is unreachable.
        await this.teamService.deleteInvite(tx, payload.code);
        await this.teamService.assignUserToProject(
          tx,
          user.id,
          invite.projectId,
          invite.role,
          inviteEnvScope(invite),
        );
      },
    );
  }

  private async runSignupFlow(
    userName: string,
    email: string,
    password: string,
    postCreate: (tx: Prisma.TransactionClient, user: User) => Promise<void>,
  ): Promise<AuthResult> {
    const hashedPassword = await this.passwordService.hashPassword(password);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await this.createUser(tx, userName, email, hashedPassword);
        await this.createAccount(tx, 'email', user.id, 'email', email);
        await postCreate(tx, user);
        return user;
      });
      this.logger.log(`User ${user.id} created`);
      return this.issueTokensOrChallenge(user.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new EmailAlreadyRegistered();
      }
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
      include: { accounts: true },
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
    // Otherwise a wrong-password attempt could consume an invite or reshuffle
    // active project for any known email. Users with zero projects are
    // routed to /select-project by the frontend instead of getting a
    // silently auto-bootstrapped one.
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
    const data = await this.prisma.code.findUnique({ where: { id: code } });
    if (!data) {
      throw new InvalidVerificationSession();
    }
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) {
      throw new AccountNotFoundError();
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const consumed = await tx.code.deleteMany({
          where: { id: code, expiresAt: { gt: new Date() } },
        });
        if (consumed.count === 0) {
          throw new InvalidVerificationSession();
        }
        await this.updatePasswordAndRevokeTokens(tx, user.id, password);
      });
    } catch (e) {
      if (e instanceof BaseError) {
        throw e;
      }
      throw new UnknownError();
    }

    // Best-effort: password is already committed, don't fail the request on a Redis hiccup.
    await this.clearPasswordFailures(user.email).catch((e) =>
      this.logger.warn(`Failed to clear password failures for ${user.email}: ${e}`),
    );

    return { success: true };
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

  // User-facing project creation. Reserved for stranded users (count === 0)
  // — the UI surfaces it only on the empty-state of /select-project. We
  // still guard server-side so a direct API caller can't bypass the rule.
  // Users acquire additional projects through team invites or admin-driven
  // ownership transfers, not through this path.
  async createOwnedProject(userId: string, name: string) {
    const existingCount = await this.prisma.userOnProject.count({ where: { userId } });
    if (existingCount > 0) {
      throw new ParamsError('You already belong to a project');
    }

    return this.prisma.$transaction(async (tx) => {
      const project = await this.createProject(tx, name, userId);
      await initialization(tx, project.id);
      return project;
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
    await this.prisma.$transaction(async (tx) => {
      // Re-check membership inside the tx so the "already a member" branch
      // and the "assign new member" branch see a consistent snapshot of
      // UserOnProject and Invite.
      const userOnProject = await tx.userOnProject.findFirst({
        where: { userId, projectId: invite.projectId },
      });
      if (userOnProject) {
        // Already a member — consume the invite anyway so it doesn't stay
        // pending in the admin's invite list and the link can't be reused.
        await this.teamService.deleteInvite(tx, invite.code);
        return;
      }

      if (user.projects.length > 0) {
        await this.teamService.cancelActiveProject(tx, userId);
      }
      // Delete the invite before assignUserToProject so the seat-limit
      // recheck inside that call does not double-count this very invite as
      // still "pending" — otherwise the last seat is unreachable.
      await this.teamService.deleteInvite(tx, invite.code);
      await this.teamService.assignUserToProject(
        tx,
        user.id,
        invite.projectId,
        invite.role,
        inviteEnvScope(invite),
      );
    });
  }
}
