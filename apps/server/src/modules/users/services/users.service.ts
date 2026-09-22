import { AuthService } from '@/modules/auth/services/auth.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { EmailChange } from '../types/email-change.type';
import type { PasswordChange } from '../types/password-change.type';
import type { UserChanges } from '../types/user-changes.type';
import { PasswordIncorrect } from '@/common/errors';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private authService: AuthService,
  ) {}

  updateUser(userId: string, newUserData: UserChanges) {
    return this.prisma.user.update({
      data: newUserData,
      where: {
        id: userId,
      },
    });
  }

  /**
   * Check if the user is an OAuth user
   * @param userId - The user ID
   * @returns True if the user is an OAuth user, false otherwise
   */
  async isOAuthUser(userId: string): Promise<boolean> {
    const user = await this.prisma.account.findFirst({
      where: { userId, type: 'oauth' },
    });

    return !!user;
  }

  async changePassword(userId: string, userPassword: string, changePassword: PasswordChange) {
    const passwordValid = await this.passwordService.validatePassword(
      changePassword.oldPassword,
      userPassword,
    );

    if (!passwordValid) {
      throw new PasswordIncorrect();
    }

    return this.prisma.$transaction((tx) =>
      this.authService.updatePasswordAndRevokeTokens(tx, userId, changePassword.newPassword),
    );
  }

  async changeEmail(userId: string, userPassword: string, input: EmailChange) {
    const passwordValid = await this.passwordService.validatePassword(input.password, userPassword);

    if (!passwordValid) {
      throw new PasswordIncorrect();
    }

    return this.prisma.user.update({
      data: {
        email: input.email,
      },
      where: { id: userId },
    });
  }
}
