import { ParamsError, TeamMemberLimitError } from '@/common/errors';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { createTransport } from 'nodemailer';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getTeamMembers(projectId: string) {
    return await this.prisma.userOnProject.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvites(projectId: string) {
    return await this.prisma.invite.findMany({
      where: { projectId, expired: false, canceled: false, deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvite(inviteId: string) {
    return await this.prisma.invite.findFirst({
      where: { code: inviteId },
      include: { user: true, project: true },
    });
  }

  async cancelInvite(inviteId: string) {
    return await this.prisma.invite.update({
      where: { id: inviteId },
      data: { canceled: true },
    });
  }

  async changeTeamMemberRole(userId: string, projectId: string, role: Role) {
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });

    // if the user is not a member of the project, throw an error
    if (!userOnProject) {
      throw new ParamsError();
    }

    return await this.prisma.$transaction(async (tx) => {
      if (role === Role.OWNER) {
        // set the owner to admin before changing the role to owner
        await tx.userOnProject.updateMany({
          where: { projectId, role: Role.OWNER },
          data: { role: Role.ADMIN },
        });
      }
      await tx.userOnProject.updateMany({
        where: { id: userOnProject.id },
        data: { role },
      });
    });
  }

  async removeTeamMember(userId: string, projectId: string) {
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });

    // if the user is the only owner of the project, throw an error
    if (!userOnProject || userOnProject.role === Role.OWNER) {
      throw new ParamsError();
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.userOnProject.delete({
        where: { id: userOnProject.id },
      });
      if (userOnProject.actived) {
        const otherUserOnProject = await tx.userOnProject.findFirst({
          where: { userId },
        });
        if (otherUserOnProject) {
          await tx.userOnProject.update({
            where: { id: otherUserOnProject.id },
            data: { actived: true },
          });
        }
      }
    });
  }

  private async validateTeamMemberLimit(projectId: string, subscriptionId: string | undefined) {
    if (!subscriptionId) {
      throw new TeamMemberLimitError();
    }
    const subscription = await this.prisma.subscription.findFirst({
      where: { subscriptionId, projectId },
    });
    if (!subscription) {
      throw new TeamMemberLimitError();
    }
    const membersCount = await this.prisma.userOnProject.count({
      where: { projectId },
    });
    const inviteCount = await this.prisma.invite.count({
      where: { projectId, expired: false, canceled: false, deleted: false },
    });
    const totalCount = membersCount + inviteCount;

    // hobby plan only has 1 member
    if (subscription?.planType === 'hobby') {
      throw new TeamMemberLimitError();
    }

    // starter plan has 3 members limit
    if (subscription.planType === 'starter' && totalCount >= 3) {
      throw new TeamMemberLimitError();
    }

    // growth plan has 10 members limit
    if (subscription.planType === 'growth' && totalCount >= 10) {
      throw new TeamMemberLimitError();
    }
  }

  async inviteTeamMember(
    senderUserId: string,
    email: string,
    projectId: string,
    name: string,
    role: Role,
  ) {
    if (role === Role.OWNER) {
      throw new ParamsError();
    }
    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !sender) {
      throw new ParamsError();
    }

    // validate team member limit
    await this.validateTeamMemberLimit(projectId, project.subscriptionId);

    const result = await this.prisma.invite.create({
      data: {
        email,
        name,
        role,
        projectId,
        userId: sender.id,
      },
    });
    await this.sendInviteEmail(result.code, email, sender.name, project.name, name);
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

  async sendInviteEmail(
    code: string,
    email: string,
    fromUserName: string,
    teamName: string,
    toUserName: string,
  ) {
    const url = `${this.configService.get('app.homepageUrl')}/auth/invite/${code}`;
    const template = await compileEmailTemplate({
      fileName: 'inviteTeamMember.mjml',
      data: {
        inviterName: fromUserName,
        name: toUserName,
        teamName,
        url,
      },
    });

    return await this.sendEmail({
      from: this.configService.get('auth.email.sender'), // sender address
      to: email, // list of receivers
      subject: `${fromUserName} invited you to Usertour`, // Subject line
      html: template, // html body
    });
  }

  async activeUserProject(userId: string, projectId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.cancelActiveProject(tx, userId);
      await this.activeUserOnProject(tx, userId, projectId);
    });
  }

  async activeUserOnProject(tx: Prisma.TransactionClient, userId: string, projectId: string) {
    return await tx.userOnProject.updateMany({
      where: { userId, projectId },
      data: { actived: true },
    });
  }

  async assignUserToProject(
    tx: Prisma.TransactionClient,
    userId: string,
    projectId: string,
    role: string,
  ) {
    return await tx.userOnProject.create({
      data: {
        userId,
        projectId,
        role: role as Role,
        actived: true,
      },
    });
  }

  async deleteInvite(tx: Prisma.TransactionClient, code: string) {
    return await tx.invite.updateMany({
      where: { code },
      data: { deleted: true },
    });
  }

  async cancelActiveProject(tx: Prisma.TransactionClient, userId: string) {
    return await tx.userOnProject.updateMany({
      where: { userId },
      data: { actived: false },
    });
  }

  async getValidInviteByCode(code: string) {
    return await this.prisma.invite.findFirst({
      where: { code, expired: false, canceled: false, deleted: false },
    });
  }

  async getUserOnProject(userId: string, projectId: string) {
    return await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
  }
}
