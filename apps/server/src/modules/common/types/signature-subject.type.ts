/** Who a signature is about. The keys are the wire strings. */
export const SignatureSubject = {
  user: 'user',
  company: 'company',
} as const;

export type SignatureSubject = keyof typeof SignatureSubject;
