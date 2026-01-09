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
import { TokenData } from './dto/auth.dto';
import { PasswordService } from './password.service';
import { createTransport } from 'nodemailer';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, UID_COOKIE } from '@/utils/cookie';
import { omit } from '@/utils/typesafe';
import ms from 'ms';
import { AuthConfigItem } from './models/auth.model';
import {
  AccountNotFoundError,
  AuthenticationExpiredError,
  EmailAlreadyRegistered,
  InvalidVerificationSession,
  OAuthError,
  PasswordIncorrect,
  UnknownError,
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
const REGISTER_REUSE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours - reuse existing register record within this window
const EMAIL_LOCK_KEY_PREFIX = 'magic-link-email:';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly teamService: TeamService,
    private readonly redisService: RedisService,
    @InjectQueue(QUEUE_SEND_MAGIC_LINK_EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_SEND_RESET_PASSWORD_EMAIL) private resetPasswordQueue: Queue,
    @InjectQueue(QUEUE_INITIALIZE_PROJECT) private initializeProjectQueue: Queue,
  ) {}

  getAuthConfig(): AuthConfigItem[] {
    const items: AuthConfigItem[] = [];
    if (this.configService.get('auth.email.enabled')) {
      items.push({ provider: 'email' });
    }
    if (this.configService.get('auth.google.enabled')) {
      items.push({ provider: 'google' });
    }
    if (this.configService.get('auth.github.enabled')) {
      items.push({ provider: 'github' });
    }
    return items;
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
    this.logger.log(
      `oauth accessToken: ${accessToken}, refreshToken: ${refreshToken}, profile: ${JSON.stringify(
        profile,
      )}, inviteCode: ${inviteCode}`,
    );
    const { provider, id, emails, displayName, photos } = profile;

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

      // inviteCode is not empty, join project
      if (inviteCode) {
        const invite = await this.teamService.getValidInviteByCode(inviteCode);
        if (invite) {
          await this.teamService.assignUserToProject(tx, newUser.id, invite.projectId, invite.role);
          await this.teamService.deleteInvite(tx, inviteCode);
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
        secret: this.configService.get('auth.jwt.refreshSecret'), // 使用单独的 refresh token 密钥
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

  async signup(payload: SignupInput): Promise<TokenData> {
    const { code, userName, companyName, password, isInvite } = payload;

    // Validate verification code
    const { email, projectId, role } = await this.validateSignupCode(code, isInvite);

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Create user and account
        const user = await this.createUser(tx, userName, email, hashedPassword);
        await this.createAccount(tx, 'email', user.id, 'email', email);

        // Handle project assignment
        if (isInvite) {
          await this.teamService.assignUserToProject(tx, user.id, projectId, role);
          await this.teamService.deleteInvite(tx, code);
        } else {
          const project = await this.createProject(tx, companyName, user.id);
          await initialization(tx, project.id);
        }

        return user;
      });

      this.logger.log(`User ${user.id} created`);
      return this.login(user.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new EmailAlreadyRegistered();
      }
      this.logger.error('Failed to signup user', e);
      throw new UnknownError();
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

  async emailLogin(email: string, password: string, inviteCode?: string): Promise<TokenData> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { projects: true, accounts: true },
    });

    if (!user) {
      throw new AccountNotFoundError();
    }

    if (user.projects.length === 0) {
      const project = await this.createProject(this.prisma, 'Unnamed Project', user.id);
      await initialization(this.prisma, project.id);
    }

    if (inviteCode) {
      await this.joinProject(inviteCode, user.id);
    }

    let hashedPassword: string = user.password;
    if (user.accounts.length === 0) {
      await this.prisma.$transaction(async (tx) => {
        await this.createAccount(tx, 'email', user.id, 'email', user.email);
        hashedPassword = await this.passwordService.hashPassword(password);
        await tx.user.update({
          data: {
            password: hashedPassword,
          },
          where: { id: user.id },
        });
      });
    }

    const passwordValid = await this.passwordService.validatePassword(password, hashedPassword);

    if (!passwordValid) {
      throw new PasswordIncorrect();
    }

    return this.login(user.id);
  }

  async resetUserPassword(email: string): Promise<Common> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AccountNotFoundError();
    }

    try {
      const result = await this.prisma.code.create({
        data: {
          userId: user.id,
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

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      throw new AccountNotFoundError();
    }

    try {
      await this.updatePasswordAndRevokeTokens(user.id, password);
      return { success: true };
    } catch (_) {
      throw new UnknownError();
    }
  }

  async validateUser(userId: string): Promise<User> {
    return await this.prisma.user.findUnique({ where: { id: userId } });
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
    const userOnProject = await this.teamService.getUserOnProject(userId, invite.projectId);
    if (userOnProject) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      if (user.projects.length > 0) {
        await this.teamService.cancelActiveProject(tx, userId);
      }
      await this.teamService.assignUserToProject(tx, user.id, invite.projectId, invite.role);
      await this.teamService.deleteInvite(tx, invite.code);
    });
  }
}
