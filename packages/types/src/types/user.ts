export type UserProfile = {
  id?: string;
  avatarUrl?: string;
  email?: string;
  isActive?: boolean;
  position?: string;
  company?: string;
  name?: string;
  projectId?: string;
  invitationToken?: string;
  isOAuthUser?: boolean;
  isSystemAdmin?: boolean;
  createdAt: string;
};
