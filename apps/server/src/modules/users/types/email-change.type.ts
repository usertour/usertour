/** An email change, proven by the password — what UsersService.changeEmail takes. */
export type EmailChange = {
  email: string;
  password: string;
};
