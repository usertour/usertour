import type { SignatureSubject } from './signature-subject.type';

export interface VerificationStats {
  subject: SignatureSubject;
  valid: number;
  invalid: number;
  missing: number;
  anonymous: number;
}
