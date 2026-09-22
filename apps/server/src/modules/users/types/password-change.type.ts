/** A password change, proven by the current one — what UsersService.changePassword takes. */
export type PasswordChange = {
  oldPassword: string;
  newPassword: string;
};
