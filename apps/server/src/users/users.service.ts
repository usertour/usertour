import { PasswordService } from '@/auth/password.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ChangeEmailInput } from './dto/change-email.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { UpdateUserInput } from './dto/update-user.input';
import { PasswordIncorrect } from '@/common/errors';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  updateUser(userId: string, newUserData: UpdateUserInput) {
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

  async changePassword(userId: string, userPassword: string, changePassword: ChangePasswordInput) {
    const passwordValid = await this.passwordService.validatePassword(
      changePassword.oldPassword,
      userPassword,
    );

    if (!passwordValid) {
      throw new PasswordIncorrect();
    }

    const hashedPassword = await this.passwordService.hashPassword(changePassword.newPassword);

    return this.prisma.user.update({
      data: {
        password: hashedPassword,
      },
      where: { id: userId },
    });
  }

  async changeEmail(userId: string, userPassword: string, input: ChangeEmailInput) {
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
