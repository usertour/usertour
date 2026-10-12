import { Role } from './permission';

export type TeamMember = {
  inviteId?: string;
  userId?: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  isInvite?: boolean;
  /** Undefined on pending-invite rows (no account yet). */
  twoFactorEnabled?: boolean;
  /**
   * Environments an EDITOR may publish to (the membership publish whitelist).
   * Meaningless for other roles; null on legacy rows is treated as empty.
   */
  allowedEnvironmentIds?: string[] | null;
};
