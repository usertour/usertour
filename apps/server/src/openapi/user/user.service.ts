import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async get(id: string) {
    return await this.prisma.bizUser.findUnique({
      where: { id },
    });
  }
}
