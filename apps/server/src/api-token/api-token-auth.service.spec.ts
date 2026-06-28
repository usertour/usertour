import type { Environment } from '@prisma/client';
import type { PrismaService } from 'nestjs-prisma';

import { EnvironmentNotInTokenScopeError } from '@/common/errors';

import { ApiTokenAuthService, type AuthedApiToken } from './api-token-auth.service';

// assertEnvironmentInScope / allowedEnvironmentIds read only the token's JSON column —
// no prisma needed, so a dummy is fine.
const svc = new ApiTokenAuthService({} as unknown as PrismaService);
const tok = (allowedEnvironmentIds: unknown): AuthedApiToken =>
  ({ allowedEnvironmentIds }) as unknown as AuthedApiToken;
const env = (id: string): Environment => ({ id }) as unknown as Environment;

describe('ApiTokenAuthService — environment scope', () => {
  it('null / absent allowlist → "all environments" (legacy/back-compat)', () => {
    expect(svc.allowedEnvironmentIds(tok(null))).toBeNull();
    expect(svc.allowedEnvironmentIds(tok(undefined))).toBeNull();
    expect(() => svc.assertEnvironmentInScope(tok(null), env('e1'))).not.toThrow();
    expect(() => svc.assertEnvironmentInScope(tok(undefined), env('whatever'))).not.toThrow();
  });

  it('env in the allowlist → allowed', () => {
    expect(svc.allowedEnvironmentIds(tok(['e1', 'e2']))).toEqual(['e1', 'e2']);
    expect(() => svc.assertEnvironmentInScope(tok(['e1', 'e2']), env('e2'))).not.toThrow();
  });

  it('env NOT in the allowlist → throws EnvironmentNotInTokenScopeError', () => {
    expect(() => svc.assertEnvironmentInScope(tok(['e1']), env('e2'))).toThrow(
      EnvironmentNotInTokenScopeError,
    );
    // empty allowlist = scoped to nothing → every environment is rejected.
    expect(() => svc.assertEnvironmentInScope(tok([]), env('e1'))).toThrow(
      EnvironmentNotInTokenScopeError,
    );
  });
});
