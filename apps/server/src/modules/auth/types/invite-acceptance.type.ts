/** An invite accepted with a new password — what AuthService.acceptInvite takes. */
export type InviteAcceptance = {
  code: string;
  password: string;
  userName: string;
};
