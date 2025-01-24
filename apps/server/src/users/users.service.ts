import { PrismaService } from "nestjs-prisma";
import { Injectable, BadRequestException } from "@nestjs/common";
import { PasswordService } from "@/auth/password.service";
import { ChangePasswordInput } from "./dto/change-password.input";
import { UpdateUserInput } from "./dto/update-user.input";
import { ChangeEmailInput } from "./dto/change-email.input";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService
  ) { }

  updateUser(userId: string, newUserData: UpdateUserInput) {
    return this.prisma.user.update({
      data: newUserData,
      where: {
        id: userId,
      },
    });
  }

  async changePassword(
    userId: string,
    userPassword: string,
    changePassword: ChangePasswordInput
  ) {
    const passwordValid = await this.passwordService.validatePassword(
      changePassword.oldPassword,
      userPassword
    );

    if (!passwordValid) {
      throw new BadRequestException("Invalid password");
    }

    const hashedPassword = await this.passwordService.hashPassword(
      changePassword.newPassword
    );

    return this.prisma.user.update({
      data: {
        password: hashedPassword,
      },
      where: { id: userId },
    });
  }

  async changeEmail(
    userId: string,
    userPassword: string,
    input: ChangeEmailInput
  ) {
    const passwordValid = await this.passwordService.validatePassword(
      input.password,
      userPassword
    );

    if (!passwordValid) {
      throw new BadRequestException("Invalid password");
    }

    return this.prisma.user.update({
      data: {
        email: input.email,
      },
      where: { id: userId },
    });
  }
}
