import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { initialization, initializationThemes } from '@/common/initialization/initialization';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { createTransport } from 'nodemailer';
import { SignupInput } from './dto/signup.input';
import { Common } from './models/common.model';
import { Token } from './models/token.model';
import { PasswordService } from './password.service';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {}

  async oauthValidate(accessToken: string, refreshToken: string, profile: Profile) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
      refreshToken,
    };
    return user;
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

  async signup(payload: SignupInput): Promise<Token> {
    const { code, userName, companyName, password } = payload;
    const register = await this.prisma.register.findFirst({
      where: { code },
    });
    if (!register) {
      throw new BadRequestException(`The code ${code} is not exist!`);
    }
    const hashedPassword = await this.passwordService.hashPassword(password);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await this.createUser(tx, userName, register.email, hashedPassword);
        const project = await this.createProject(tx, companyName, user.id);
        await initialization(tx, project.id);
        return this.generateTokens({
          userId: user.id,
        });
      });
    } catch (e) {
      console.log(e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Email ${register.email} already used.`);
      }
      throw new Error(e);
    }
  }

  async login(email: string, password: string): Promise<Token> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { projects: true },
    });

    if (!user) {
      throw new NotFoundException(`No user found for email: ${email}`);
    }

    if (user.projects.length === 0) {
      const project = await this.createProject(this.prisma, 'Unnamed Project', user.id);
      await initialization(this.prisma, project.id);
    }

    const passwordValid = await this.passwordService.validatePassword(password, user.password);

    if (!passwordValid) {
      throw new BadRequestException('Invalid password');
    }

    return this.generateTokens({
      userId: user.id,
    });
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

  generateTokens(payload: { userId: string }): Token {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  private generateAccessToken(payload: { userId: string }): string {
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(payload: { userId: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('security.jwtRefreshSecret'),
      expiresIn: this.configService.get('security.refreshIn'),
    });
  }

  refreshToken(token: string) {
    try {
      const { userId } = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      return this.generateTokens({
        userId,
      });
    } catch (_) {
      throw new UnauthorizedException();
    }
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
