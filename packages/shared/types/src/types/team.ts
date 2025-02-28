export type TeamMember = {
  id?: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  createdAt: string;
  logo?: string;
};

export enum TeamMemberRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  OWNER = 'OWNER',
}
