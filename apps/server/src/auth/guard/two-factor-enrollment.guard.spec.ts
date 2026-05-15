import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TwoFactorEnrollmentRequiredError } from '@/common/errors';
import { TwoFactorService } from '@/auth/two-factor.service';
import { TwoFactorEnrollmentGuard } from './two-factor-enrollment.guard';

// Build a fake ExecutionContext that resembles what NestJS hands a guard
// during a GraphQL field resolution. Only the bits the guard actually reads
// are populated — guard tests intentionally stay below the network layer.
const makeContext = (opts: {
  user?: { twoFactorEnabled: boolean } | null;
  parentTypeName?: 'Query' | 'Mutation' | 'User';
  isPublic?: boolean;
  isSkipExempt?: boolean;
  graphql?: boolean;
}): ExecutionContext => {
  const handler = () => undefined;
  const cls = class {};
  return {
    getType: () => (opts.graphql === false ? 'http' : 'graphql'),
    getHandler: () => handler,
    getClass: () => cls,
    getArgs: () => [
      null,
      null,
      { req: { user: opts.user ?? null } },
      { parentType: { name: opts.parentTypeName ?? 'Query' } },
    ],
  } as unknown as ExecutionContext;
};

describe('TwoFactorEnrollmentGuard', () => {
  let guard: TwoFactorEnrollmentGuard;
  let reflector: jest.Mocked<Reflector>;
  let twoFactor: jest.Mocked<TwoFactorService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;
    twoFactor = {
      isInstanceEnforcing: jest.fn().mockResolvedValue(true),
    } as any;
    guard = new TwoFactorEnrollmentGuard(reflector, twoFactor);
  });

  it('passes non-GraphQL contexts through (REST, websocket)', async () => {
    await expect(
      guard.canActivate(makeContext({ user: { twoFactorEnabled: false }, graphql: false })),
    ).resolves.toBe(true);
  });

  it('passes when the endpoint is @Public()', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === 'isPublic');
    await expect(guard.canActivate(makeContext({ user: null }))).resolves.toBe(true);
  });

  it('passes ResolveField calls — enforcement runs only on top-level operations', async () => {
    await expect(
      guard.canActivate(makeContext({ user: { twoFactorEnabled: false }, parentTypeName: 'User' })),
    ).resolves.toBe(true);
    expect(twoFactor.isInstanceEnforcing).not.toHaveBeenCalled();
  });

  it('passes when no user is on the request', async () => {
    await expect(guard.canActivate(makeContext({ user: null }))).resolves.toBe(true);
  });

  it('passes enrolled users without ever consulting the instance setting', async () => {
    await expect(
      guard.canActivate(makeContext({ user: { twoFactorEnabled: true } })),
    ).resolves.toBe(true);
    expect(twoFactor.isInstanceEnforcing).not.toHaveBeenCalled();
  });

  it('passes @SkipTwoFactorEnrollment endpoints (bootstrap surface)', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === 'skip2FAEnrollment');
    await expect(
      guard.canActivate(makeContext({ user: { twoFactorEnabled: false } })),
    ).resolves.toBe(true);
    expect(twoFactor.isInstanceEnforcing).not.toHaveBeenCalled();
  });

  it('passes when the instance does not enforce 2FA', async () => {
    twoFactor.isInstanceEnforcing.mockResolvedValue(false);
    await expect(
      guard.canActivate(makeContext({ user: { twoFactorEnabled: false } })),
    ).resolves.toBe(true);
  });

  it('rejects authenticated non-enrolled callers when enforcement is on', async () => {
    twoFactor.isInstanceEnforcing.mockResolvedValue(true);
    await expect(
      guard.canActivate(makeContext({ user: { twoFactorEnabled: false } })),
    ).rejects.toBeInstanceOf(TwoFactorEnrollmentRequiredError);
  });
});
