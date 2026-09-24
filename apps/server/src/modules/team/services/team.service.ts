import {
  InvitationDeliveryFailedError,
  InviteSeatExhaustedError,
  ParamsError,
  TeamMemberAlreadyInProjectError,
  TeamMemberAlreadyInvitedError,
  TeamMemberLimitError,
} from '@/modules/common/errors/errors';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { EmailService } from '@/modules/common/services/email.service';
import { type SendEmailInput } from '@/modules/common/types/send-email-input.type';
import { renderInviteTeamMemberEmail } from '@usertour/emails';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { activeInviteWhere } from '../utils/active-invite-where.util';

const INVITE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly emailService: EmailService,
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
      where: { projectId, ...activeInviteWhere() },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvite(inviteId: string) {
    // Public query. Hide canceled / deleted / expired invites so the frontend
    // does not render a "Join project" form against a dead link (which would
    // fail at submit anyway), and so attackers can't tell whether a stale
    // code was ever valid.
    //
    // The invitee email IS returned — the signup form needs it to show the
    // user which mailbox the account will be created under, and the actual
    // takeover risk is closed by H1 (joinProject enforces actor email ===
    // invite email). Anyone with the link already received the email and
    // therefore already knows the recipient.
    const invite = await this.prisma.invite.findFirst({
      where: { code: inviteId, ...activeInviteWhere() },
      select: {
        id: true,
        role: true,
        email: true,
        user: { select: { name: true } },
        project: {
          select: { id: true, name: true, ssoSettings: { select: { requireSso: true } } },
        },
      },
    });
    if (!invite) {
      return null;
    }
    const recipient = await this.prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    return {
      id: invite.id,
      role: invite.role,
      email: invite.email,
      recipientExists: !!recipient,
      // Raw flag; the invite page only enforces it when SSO is actually usable
      // (an active provider exists), matching the lapsed-entitlement gate-drop.
      requireSso: invite.project.ssoSettings?.requireSso ?? false,
      user: invite.user,
      project: { id: invite.project.id, name: invite.project.name },
    };
  }

  async cancelInvite(projectId: string, inviteId: string) {
    const result = await this.prisma.invite.updateMany({
      where: { id: inviteId, projectId },
      data: { canceled: true },
    });
    // Without this guard, an OWNER of project A could cancel an invite
    // belonging to project B by passing B's inviteId in the input.
    if (result.count === 0) {
      throw new ParamsError();
    }
  }

  async changeTeamMemberRole(
    userId: string,
    projectId: string,
    role: Role,
    allowedEnvironmentIds?: string[] | null,
  ) {
    if (!userId || !projectId) {
      throw new ParamsError();
    }
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });

    // if the user is not a member of the project, throw an error
    if (!userOnProject) {
      throw new ParamsError();
    }
    // The OWNER row moves only through transferOwnership: nobody is made
    // OWNER here, and the OWNER's own role cannot be changed here (the web
    // hides the action; this is the server-side invariant, so a project can
    // never end up with zero owners).
    if (role === Role.OWNER || userOnProject.role === Role.OWNER) {
      throw new ParamsError();
    }
    const publishWhitelist = await this.resolvePublishWhitelist(
      projectId,
      role,
      allowedEnvironmentIds,
    );

    // The publish whitelist is an EDITOR attribute: it is rewritten on every
    // role change, so a member promoted out of EDITOR carries no stale list
    // and one demoted into it starts from what the caller chose.
    await this.prisma.userOnProject.update({
      where: { id: userOnProject.id },
      data: { role, allowedEnvironmentIds: publishWhitelist ?? Prisma.DbNull },
    });
  }

  /**
   * Make `userId` the project's OWNER. The single-owner invariant holds
   * inside the transaction: every current OWNER is demoted to ADMIN first.
   * Neither row keeps a publish whitelist (ADMIN and OWNER publish anywhere).
   */
  async transferOwnership(projectId: string, userId: string) {
    if (!userId || !projectId) {
      throw new ParamsError();
    }
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
      include: { user: { select: { disabled: true } } },
    });
    if (!userOnProject || userOnProject.role === Role.OWNER) {
      throw new ParamsError();
    }
    // A disabled account cannot sign in, and the demoted owner (now ADMIN)
    // cannot transfer again — the project would be stranded until an instance
    // admin intervenes. Same gate as adding a member.
    if (userOnProject.user?.disabled) {
      throw new ParamsError();
    }
    return await this.prisma.$transaction(async (tx) => {
      await tx.userOnProject.updateMany({
        where: { projectId, role: Role.OWNER },
        data: { role: Role.ADMIN, allowedEnvironmentIds: Prisma.DbNull },
      });
      await tx.userOnProject.update({
        where: { id: userOnProject.id },
        data: { role: Role.OWNER, allowedEnvironmentIds: Prisma.DbNull },
      });
    });
  }

  /**
   * The publish whitelist to persist for a role. EDITOR keeps the requested
   * environment ids (each must be a live environment of the project; omitted
   * = may publish nowhere). Every other role carries none: ADMIN and OWNER
   * publish everywhere by capability, VIEWER never publishes.
   */
  private async resolvePublishWhitelist(
    projectId: string,
    role: Role,
    requested?: string[] | null,
  ): Promise<string[] | null> {
    if (role !== Role.EDITOR) {
      return null;
    }
    const environmentIds = [...new Set(requested ?? [])];
    if (environmentIds.length === 0) {
      return [];
    }
    const live = await this.prisma.environment.findMany({
      where: { id: { in: environmentIds }, projectId, deleted: false },
      select: { id: true },
    });
    if (live.length !== environmentIds.length) {
      throw new ParamsError();
    }
    return environmentIds;
  }

  async removeTeamMember(userId: string, projectId: string) {
    if (!userId || !projectId) {
      throw new ParamsError();
    }
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

  async inviteTeamMember(
    senderUserId: string,
    email: string,
    projectId: string,
    name: string,
    role: Role,
    allowedEnvironmentIds?: string[] | null,
  ) {
    if (role === Role.OWNER) {
      throw new ParamsError();
    }
    const publishWhitelist = await this.resolvePublishWhitelist(
      projectId,
      role,
      allowedEnvironmentIds,
    );
    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !sender) {
      throw new ParamsError();
    }

    // Serialize invite creation per-project so dedup + seat-limit + create
    // are race-free. Prisma's $transaction defaults to READ COMMITTED, which
    // gives atomicity but NOT isolation against concurrent inserts — two
    // parallel requests would both pass the dedup/seat checks and both
    // commit, producing duplicate "pending" rows or overrunning the cap.
    // pg_advisory_xact_lock serializes only same-project invite creation
    // and auto-releases on commit/rollback. Cross-project invites still run
    // in parallel since they hash to different keys.
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`invite-create:${projectId}`})::bigint)`;

      // Block duplicate invites and re-inviting an existing member —
      // otherwise the same email shows up multiple times under "Invite
      // pending" and each row counts against teamMemberLimit on its own,
      // letting a project artificially fill its seat quota.
      const pendingInvite = await tx.invite.findFirst({
        where: { projectId, email, ...activeInviteWhere() },
      });
      if (pendingInvite) {
        throw new TeamMemberAlreadyInvitedError();
      }
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        const existingMembership = await tx.userOnProject.findFirst({
          where: { userId: existingUser.id, projectId },
        });
        if (existingMembership) {
          throw new TeamMemberAlreadyInProjectError();
        }
      }

      await this.projectsService.checkTeamMemberLimit(projectId, tx);

      return await tx.invite.create({
        data: {
          email,
          name,
          role,
          projectId,
          userId: sender.id,
          allowedEnvironmentIds: publishWhitelist ?? undefined,
          expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
        },
      });
    });

    // Roll the invite back if the SMTP layer rejects the recipient
    // (550 / EENVELOPE) or fails for any other reason — otherwise an
    // orphan "Invite pending" row sticks around, the recipient never
    // gets the email, and our own dedup check blocks the user from
    // retrying with a corrected address. We soft-delete (deleted=true)
    // for consistency with the accept / cancel paths.
    try {
      await this.sendInviteEmail(result.code, email, sender.name, project.name, name);
    } catch (error) {
      await this.prisma.invite.update({
        where: { id: result.id },
        data: { deleted: true },
      });
      this.logger.error(
        `Failed to send invite email to ${email} for project ${projectId}: ${
          (error as Error).message
        }`,
      );
      throw new InvitationDeliveryFailedError();
    }
  }

  async sendEmail(data: SendEmailInput) {
    // Shared transport (shared/EmailService) — the module-local createTransport
    // copy predated the extraction. Throwing variant on purpose: an invite the
    // user just asked for must fail loudly, not skip silently.
    return await this.emailService.send(data);
  }

  async sendInviteEmail(
    code: string,
    email: string,
    fromUserName: string,
    projectName: string,
    toUserName: string,
  ) {
    const url = `${this.configService.get('app.homepageUrl')}/auth/invite/${code}`;
    const rendered = renderInviteTeamMemberEmail({
      inviterName: fromUserName,
      name: toUserName,
      projectName,
      url,
    });

    return await this.sendEmail({
      from: this.configService.get('auth.email.sender'),
      to: email,
      ...rendered,
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
    allowedEnvironmentIds?: string[] | null,
  ) {
    // Re-check seat limit at accept time — the project may have downgraded
    // since the invite was created, or other invites may have consumed the
    // quota in between. Runs against the transaction client so the count
    // reflects state inside this commit. Reframe the admin-facing
    // TeamMemberLimitError ("upgrade your plan") into a recipient-facing
    // InviteSeatExhaustedError ("contact the inviter") — the invitee
    // shouldn't be told to upgrade someone else's plan.
    try {
      await this.projectsService.checkTeamMemberLimit(projectId, tx);
    } catch (error) {
      if (error instanceof TeamMemberLimitError) {
        throw new InviteSeatExhaustedError();
      }
      throw error;
    }
    // The invite's publish whitelist was validated at CREATION, and invites live
    // for days — an environment deleted in between must not ride into the new
    // membership as a dead id. Filter to the project's live environments; a
    // whitelist that empties out stays [] (the editor can publish nowhere)
    // rather than silently widening to null.
    let liveAllowed = allowedEnvironmentIds ?? null;
    if (liveAllowed?.length) {
      const live = await tx.environment.findMany({
        where: { id: { in: liveAllowed }, projectId, deleted: false },
        select: { id: true },
      });
      const liveIds = new Set(live.map((e) => e.id));
      liveAllowed = liveAllowed.filter((id) => liveIds.has(id));
    }
    return await tx.userOnProject.create({
      data: {
        userId,
        projectId,
        role: role as Role,
        actived: true,
        allowedEnvironmentIds: liveAllowed ?? undefined,
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
      where: { code, ...activeInviteWhere() },
    });
  }

  // Accept-time lookup for the SSO flow: a still-acceptable invite for this
  // email + project. Email is matched case-insensitively (invite emails are
  // stored as typed). activeInviteWhere() supplies the top-level OR, so callers
  // must not add their own.
  async getValidInviteForEmailAndProject(email: string, projectId: string) {
    return await this.prisma.invite.findFirst({
      where: {
        projectId,
        email: { equals: email, mode: 'insensitive' },
        ...activeInviteWhere(),
      },
    });
  }

  async getUserOnProject(userId: string, projectId: string) {
    if (!userId || !projectId) {
      return null;
    }
    return await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
  }
}
