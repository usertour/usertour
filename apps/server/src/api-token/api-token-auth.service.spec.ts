import type { Environment } from '@prisma/client';
import { Role } from '@usertour/types';
import type { PrismaService } from 'nestjs-prisma';

import {
  EnvironmentNotInTokenScopeError,
  MemberCannotPublishToEnvironmentError,
} from '@/common/errors';

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

  // The owner's MEMBERSHIP publish whitelist (cached by authorize) bounds
  // publishing only: an EDITOR must not escape it by minting a broader key,
  // while ADMIN / OWNER publish anywhere and reads are never restricted by it.
  describe('assertMayPublishTo', () => {
    const editorToken = (whitelist: string[] | undefined) =>
      ({
        allowedEnvironmentIds: null,
        memberRole: Role.EDITOR,
        memberRoleProjectId: 'p1',
        memberPublishEnvironmentIds: whitelist,
      }) as unknown as AuthedApiToken;

    it('EDITOR may publish only to whitelisted environments', () => {
      expect(() => svc.assertMayPublishTo(editorToken(['e1']), 'p1', 'e1')).not.toThrow();
      expect(() => svc.assertMayPublishTo(editorToken(['e1']), 'p1', 'e2')).toThrow(
        MemberCannotPublishToEnvironmentError,
      );
      // No / empty whitelist = may publish nowhere (never "everywhere").
      expect(() => svc.assertMayPublishTo(editorToken(undefined), 'p1', 'e1')).toThrow(
        MemberCannotPublishToEnvironmentError,
      );
      expect(() => svc.assertMayPublishTo(editorToken([]), 'p1', 'e1')).toThrow(
        MemberCannotPublishToEnvironmentError,
      );
    });

    it("the whitelist does not narrow the key's environment scope (reads/writes)", () => {
      const token = editorToken(['e1']);
      expect(svc.allowedEnvironmentIds(token)).toBeNull();
      expect(() => svc.assertEnvironmentInScope(token, env('e2'))).not.toThrow();
    });

    it('ADMIN and OWNER publish anywhere regardless of the column', () => {
      for (const role of [Role.ADMIN, Role.OWNER]) {
        const token = {
          allowedEnvironmentIds: null,
          memberRole: role,
          memberRoleProjectId: 'p1',
          memberPublishEnvironmentIds: [],
        } as unknown as AuthedApiToken;
        expect(() => svc.assertMayPublishTo(token, 'p1', 'anywhere')).not.toThrow();
      }
    });

    it('publishableEnvironmentIds = key scope ∩ whitelist for an editor, key scope otherwise', () => {
      const editor = (scope: string[] | null, whitelist: string[]) =>
        ({
          allowedEnvironmentIds: scope,
          memberRole: Role.EDITOR,
          memberRoleProjectId: 'p1',
          memberPublishEnvironmentIds: whitelist,
        }) as unknown as AuthedApiToken;
      expect(svc.publishableEnvironmentIds(editor(null, ['e1', 'e2']), 'p1')).toEqual(['e1', 'e2']);
      expect(svc.publishableEnvironmentIds(editor(['e2', 'e3'], ['e1', 'e2']), 'p1')).toEqual([
        'e2',
      ]);
      expect(svc.publishableEnvironmentIds(editor(['e3'], ['e1']), 'p1')).toEqual([]);
      const admin = {
        allowedEnvironmentIds: ['e9'],
        memberRole: Role.ADMIN,
        memberRoleProjectId: 'p1',
        memberPublishEnvironmentIds: [],
      } as unknown as AuthedApiToken;
      expect(svc.publishableEnvironmentIds(admin, 'p1')).toEqual(['e9']);
      // No cached role (authorize did not run): nowhere, matching assertMayPublishTo.
      expect(svc.publishableEnvironmentIds(tok(null), 'p1')).toEqual([]);
    });

    it('a verdict cached for another project never decides this one (multi-project key)', () => {
      const cachedForP1 = {
        allowedEnvironmentIds: null,
        memberRole: Role.OWNER,
        memberRoleProjectId: 'p1',
        memberPublishEnvironmentIds: [],
      } as unknown as AuthedApiToken;
      expect(() => svc.assertMayPublishTo(cachedForP1, 'p1', 'e1')).not.toThrow();
      expect(() => svc.assertMayPublishTo(cachedForP1, 'p2', 'e1')).toThrow(
        MemberCannotPublishToEnvironmentError,
      );
      expect(svc.publishableEnvironmentIds(cachedForP1, 'p2')).toEqual([]);
    });

    it('names the publishable environments when the caller passes them', () => {
      const staging = { id: 'e1', name: 'Staging' };
      expect(
        new MemberCannotPublishToEnvironmentError({
          publishable: [staging],
          whitelisted: [staging],
        }).messageDict.en,
      ).toContain('Staging (e1)');
      expect(
        new MemberCannotPublishToEnvironmentError({ publishable: [], whitelisted: [staging] })
          .messageDict.en,
      ).toContain('not scoped to any environment its owner may publish to');
      expect(
        new MemberCannotPublishToEnvironmentError({ publishable: [], whitelisted: [] }).messageDict
          .en,
      ).toContain('any environment');
    });

    it('fails closed when authorize has not cached the role', () => {
      expect(() => svc.assertMayPublishTo(tok(null), 'p1', 'e1')).toThrow(
        MemberCannotPublishToEnvironmentError,
      );
    });
  });
});
