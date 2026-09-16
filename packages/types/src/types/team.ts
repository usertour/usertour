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
  logo?: string;
  /**
   * Environments an EDITOR may publish to (the membership publish whitelist).
   * Meaningless for other roles; null on legacy rows is treated as empty.
   */
  allowedEnvironmentIds?: string[] | null;
};

export enum TeamMemberRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
  OWNER = 'OWNER',
}
