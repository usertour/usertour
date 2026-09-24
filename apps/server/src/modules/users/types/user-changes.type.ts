/** The profile fields a user may change — what UsersService.updateUser takes. */
export type UserChanges = {
  name: string;
  avatarUrl?: string;
};
