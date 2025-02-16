import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { initialization, initializationThemes } from '@/common/initialization/initialization';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { createTransport } from 'nodemailer';
import { SignupInput } from './dto/signup.input';
import { Common } from './models/common.model';
import { PasswordService } from './password.service';
import { Profile } from 'passport-google-oauth20';
import { CookieOptions, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, UID_COOKIE } from '@/utils/cookie';
import { TokenData } from './dto/auth.dto';
import { omit } from '@/utils/typesafe';
import ms from 'ms';
import { AuthConfigItem } from './models/auth.model';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
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
      domain: this.configService.get('auth.cookieDomain') ?? '',
      secure: true,
      sameSite: 'strict',
      path: '/',
    };

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

  async oauthValidate(accessToken: string, refreshToken: string, profile: Profile) {
    this.logger.log(
      `oauth accessToken: ${accessToken}, refreshToken: ${refreshToken}, profile: ${JSON.stringify(
        profile,
      )}`,
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
        where: {
          id: account.userId,
        },
      });
      if (user) {
        return user;
      }

      this.logger.log(
        `user ${account.userId} not found for provider ${provider} account id: ${id}`,
      );
    }

    // oauth profile returns no email, this is invalid
    if (emails?.length === 0) {
      this.logger.warn('emails is empty, invalid oauth');
      throw new BadRequestException('emails is empty, invalid oauth');
    }
    const email = emails[0].value;

    // Return user if this email has been registered
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      this.logger.log(`user ${user.id} already registered for email ${email}`);
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

      const project = await this.createProject(tx, 'Unnamed Project', newUser.id);
      await initialization(tx, project.id);
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
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      // Revoke the current refresh token (one-time use)
      await this.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { revoked: true },
      });

      // Generate new tokens
      return this.login(payload.userId);
    } catch (_) {
      throw new UnauthorizedException('Invalid refresh token');
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

  async createMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      throw new ConflictException({
        code: '10001',
        msg: `The email ${email} is registed`,
      });
    }

    try {
      const result = await this.prisma.register.create({
        data: {
          email,
        },
      });
      await this.sendMagicLinkEmail(result.code, email);
      return result;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Failed to create margin link!!', e);
    }
  }

  async resendMargicLink(id: string) {
    const data = await this.prisma.register.findUnique({ where: { id } });
    if (!data) {
      throw new BadRequestException('Bad margic link id!');
    }
    try {
      await this.sendMagicLinkEmail(data.code, data.email);
      return data;
    } catch (_) {
      throw new BadRequestException('Failed to create margin link!!');
    }
  }

  async signup(payload: SignupInput): Promise<TokenData> {
    const { code, userName, companyName, password } = payload;
    const register = await this.prisma.register.findFirst({
      where: { code },
    });
    if (!register) {
      throw new BadRequestException(`The code ${code} is not exist!`);
    }
    const hashedPassword = await this.passwordService.hashPassword(password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await this.createUser(tx, userName, register.email, hashedPassword);
        await this.createAccount(tx, 'email', user.id, 'email', register.email);
        const project = await this.createProject(tx, companyName, user.id);
        await initialization(tx, project.id);
        return user;
      });
      this.logger.log(`User ${user.id} created`);
      return this.login(user.id);
    } catch (e) {
      console.log(e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Email ${register.email} already used.`);
      }
      throw new Error(e);
    }
  }

  async emailLogin(email: string, password: string): Promise<TokenData> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { projects: true, accounts: true },
    });

    if (!user) {
      throw new NotFoundException(`No user found for email: ${email}`);
    }

    if (user.projects.length === 0) {
      const project = await this.createProject(this.prisma, 'Unnamed Project', user.id);
      await initialization(this.prisma, project.id);
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
      throw new BadRequestException('Invalid password');
    }

    return this.login(user.id);
  }

  async resetUserPassword(email: string): Promise<Common> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ConflictException({
        code: '10002',
        msg: `The email ${email} is not registed`,
      });
    }

    try {
      const result = await this.prisma.code.create({
        data: {
          userId: user.id,
        },
      });
      await this.sendResetPasswordEmail(result.id, email, user.name);
      return { success: true };
    } catch (e) {
      throw new BadRequestException('Failed to resete password!!', e);
    }
  }

  async resetUserPasswordByCode(code: string, password: string): Promise<Common> {
    const data = await this.prisma.code.findUnique({ where: { id: code } });
    if (!data) {
      throw new ConflictException({
        code: '10003',
        msg: 'The not is invalid',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      throw new ConflictException({
        code: '10003',
        msg: 'The user is empay',
      });
    }

    try {
      const hashedPassword = await this.passwordService.hashPassword(password);
      await this.prisma.user.update({
        data: {
          password: hashedPassword,
        },
        where: { id: user.id },
      });
      return { success: true };
    } catch (e) {
      throw new BadRequestException('Failed to resete password!!', e);
    }
  }

  async validateUser(userId: string): Promise<User> {
    return await this.prisma.user.findUnique({ where: { id: userId } });
  }

  async getUserFromToken(token: string): Promise<User> {
    const { userId } = this.jwtService.decode(token);
    return await this.prisma.user.findUnique({ where: { id: userId } });
  }

  async sendEmail(data: any) {
    const transporter = createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: true,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
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
      from: '"support" support@usertour.io', // sender address
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
      from: '"support" support@appnps.com', // sender address
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
          create: [{ userId, role: 'ADMIN', actived: true }],
        },
        environments: {
          create: [
            {
              name: 'Production',
              segments: {
                create: [
                  {
                    name: 'All Users',
                    bizType: SegmentBizType.USER,
                    dataType: SegmentDataType.ALL,
                    data: [],
                  },
                  {
                    name: 'All Companies',
                    bizType: SegmentBizType.COMPANY,
                    dataType: SegmentDataType.ALL,
                    data: [],
                  },
                ],
              },
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
}
