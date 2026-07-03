export type TeamMember = {
  inviteId?: string;
  userId?: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  createdAt: string;
  isInvite?: boolean;
  /** Undefined on pending-invite rows (no account yet). */
  twoFactorEnabled?: boolean;
  /** Environments the member may act on; null/undefined = all. */
  allowedEnvironmentIds?: string[] | null;
  logo?: string;
};

export enum TeamMemberRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  OWNER = 'OWNER',
}
