/** A new account from an invite/signup code — what AuthService.signup takes. */
export type NewSignup = {
  code: string;
  password: string;
  userName: string;
  companyName: string;
};
