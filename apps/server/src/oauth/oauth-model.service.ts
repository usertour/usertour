import { Injectable } from '@nestjs/common';
import type {
  AuthorizationCode,
  AuthorizationCodeModel,
  Client,
  Falsey,
  RefreshToken,
  RefreshTokenModel,
  Token,
  User,
} from '@node-oauth/oauth2-server';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { OAUTH_TOKEN_PREFIX } from '@/api-token/api-token.crypto';

import {
  accessTokenSecret,
  composeOAuthAccessToken,
  composeOAuthRefreshToken,
  generateOpaqueSecret,
  hashSecret,
  tokenFingerprint,
} from './oauth.crypto';

const ALL_CAPABILITIES = new Set<string>(Object.values(Capability));

/** A `user` object as it flows through @node-oauth (transparent to the library). */
interface OAuthUser extends User {
  id: string;
  projectId: string;
  grantId: string;
  /** Environments this grant may act on; null/absent = all (carried consent → code → token). */
  allowedEnvironmentIds?: string[] | null;
}

const toUris = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : typeof value === 'string' ? [value] : [];

/**
 * The @node-oauth/oauth2-server model — the only place OAuth protocol state
 * touches the DB. Access tokens are written as `ApiToken` rows (`uto_`, `clientId`
 * + `oauthGrantId` set) so the existing `McpAuthGuard` validates them unchanged;
 * authorization codes and refresh-token lineage live in their own tables.
 * Scopes are our `Capability` strings; the live role∩scope check still runs per
 * request in `ApiTokenAuthService.authorize`.
 */
@Injectable()
export class OAuthModelService implements AuthorizationCodeModel, RefreshTokenModel {
  constructor(private readonly prisma: PrismaService) {}

  // ── Client ────────────────────────────────────────────────────────────────
  // The library calls getClient in BOTH the authorize flow (issuing a code, with a
  // null secret) and the token flow. So it only VERIFIES a secret when one is
  // presented — it must return a confidential client during authorize where no
  // secret is sent. Requiring a confidential client to authenticate on the TOKEN
  // endpoint is enforced separately, in OAuthService.token (which knows the
  // endpoint), so this stays usable by both flows.
  async getClient(clientId: string, clientSecret: string): Promise<Client | Falsey> {
    const client = await this.prisma.oAuthClient.findUnique({ where: { id: clientId } });
    if (!client) {
      return false;
    }
    if (clientSecret) {
      if (!client.clientSecretHash || hashSecret(clientSecret) !== client.clientSecretHash) {
        return false;
      }
    }
    return {
      id: client.id,
      name: client.name,
      grants: toUris(client.grantTypes),
      redirectUris: toUris(client.redirectUris),
    };
  }

  async validateRedirectUri(redirectUri: string, client: Client): Promise<boolean> {
    return toUris(client.redirectUris).includes(redirectUri);
  }

  // Requested scopes must all be known Capability strings; the consent screen has
  // already narrowed them to the user's role∩request, and the per-request guard
  // re-checks role∩scope, so here we only reject unknown scope tokens.
  async validateScope(_user: User, _client: Client, scope?: string[]): Promise<string[] | Falsey> {
    const requested = scope ?? [];
    if (requested.some((s) => !ALL_CAPABILITIES.has(s))) {
      return false;
    }
    return requested;
  }

  // ── Authorization code ──────────────────────────────────────────────────────
  async generateAuthorizationCode(): Promise<string> {
    return generateOpaqueSecret();
  }

  async saveAuthorizationCode(
    code: Pick<
      AuthorizationCode,
      | 'authorizationCode'
      | 'expiresAt'
      | 'redirectUri'
      | 'scope'
      | 'codeChallenge'
      | 'codeChallengeMethod'
    >,
    client: Client,
    user: User,
  ): Promise<AuthorizationCode | Falsey> {
    const u = user as OAuthUser;
    await this.prisma.oAuthAuthorizationCode.create({
      data: {
        hashedCode: hashSecret(code.authorizationCode),
        clientId: client.id,
        userId: u.id,
        projectId: u.projectId,
        scopes: code.scope ?? [],
        allowedEnvironmentIds: u.allowedEnvironmentIds ?? undefined,
        redirectUri: code.redirectUri,
        codeChallenge: code.codeChallenge ?? null,
        codeChallengeMethod: code.codeChallengeMethod ?? null,
        grantId: u.grantId,
        expiresAt: code.expiresAt,
      },
    });
    return { ...code, client, user };
  }

  async getAuthorizationCode(authorizationCode: string): Promise<AuthorizationCode | Falsey> {
    const row = await this.prisma.oAuthAuthorizationCode.findUnique({
      where: { hashedCode: hashSecret(authorizationCode) },
    });
    if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
      return false;
    }
    const client = await this.getClient(row.clientId, '');
    if (!client) {
      return false;
    }
    return {
      authorizationCode,
      expiresAt: row.expiresAt,
      redirectUri: row.redirectUri,
      scope: (row.scopes as string[]) ?? [],
      codeChallenge: row.codeChallenge ?? undefined,
      codeChallengeMethod: row.codeChallengeMethod ?? undefined,
      client,
      user: {
        id: row.userId,
        projectId: row.projectId,
        grantId: row.grantId,
        allowedEnvironmentIds: (row.allowedEnvironmentIds as string[] | null) ?? null,
      } as OAuthUser,
    };
  }

  async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
    const res = await this.prisma.oAuthAuthorizationCode.updateMany({
      where: { hashedCode: hashSecret(code.authorizationCode), consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return res.count > 0;
  }

  // ── Tokens ──────────────────────────────────────────────────────────────────
  async generateAccessToken(): Promise<string> {
    return composeOAuthAccessToken(generateOpaqueSecret());
  }

  async generateRefreshToken(): Promise<string> {
    return composeOAuthRefreshToken(generateOpaqueSecret());
  }

  async saveToken(token: Token, client: Client, user: User): Promise<Token | Falsey> {
    const u = user as OAuthUser;
    const scopes = token.scope ?? [];

    // Replace semantics: a fresh authorization from the same installation —
    // same (user, clientId, project) — SUPERSEDES any previous active grant.
    // Without this, re-authorizing to narrow scopes/environments leaves the
    // old broader grant alive ("thought I tightened it, the old key still
    // works"). Other machines register their own clientId via DCR, so their
    // grants are untouched and coexist. Also self-heals pre-policy duplicates
    // on refresh rotation (own grantId excluded).
    const stale = await this.prisma.oAuthGrant.findMany({
      where: {
        userId: u.id,
        clientId: client.id,
        projectId: u.projectId,
        revokedAt: null,
        id: { not: u.grantId },
      },
      select: { id: true },
    });
    if (stale.length > 0) {
      const ids = stale.map((g) => g.id);
      await this.prisma.$transaction([
        this.prisma.apiToken.updateMany({
          where: { oauthGrantId: { in: ids } },
          data: { isActive: false },
        }),
        this.prisma.oAuthGrant.updateMany({
          where: { id: { in: ids } },
          data: { revokedAt: new Date(), hashedRefreshToken: null },
        }),
      ]);
    }

    // Rotate the grant's refresh hash AND issue the access-token row atomically.
    // Unpaired, a failure between the two bricks the connection: the OLD refresh
    // token no longer resolves (hash already rotated) and the NEW one was never
    // delivered — the client's retry gets invalid_grant and the user must
    // re-consent. One transaction keeps rotation-and-issuance all-or-nothing.
    const secret = accessTokenSecret(token.accessToken);
    await this.prisma.$transaction(async (tx) => {
      // Rotating refresh overwrites the prior hash so an old refresh token no
      // longer resolves (reuse detection).
      await tx.oAuthGrant.upsert({
        where: { id: u.grantId },
        create: {
          id: u.grantId,
          userId: u.id,
          clientId: client.id,
          projectId: u.projectId,
          scopes,
          allowedEnvironmentIds: u.allowedEnvironmentIds ?? undefined,
          hashedRefreshToken: token.refreshToken ? tokenFingerprint(token.refreshToken) : null,
          refreshExpiresAt: token.refreshTokenExpiresAt ?? null,
        },
        update: {
          scopes,
          allowedEnvironmentIds: u.allowedEnvironmentIds ?? undefined,
          hashedRefreshToken: token.refreshToken ? tokenFingerprint(token.refreshToken) : null,
          refreshExpiresAt: token.refreshTokenExpiresAt ?? null,
          revokedAt: null,
        },
      });

      // The access token IS an ApiToken row — validated by the existing guard.
      if (secret) {
        await tx.apiToken.create({
          data: {
            userId: u.id,
            name: `OAuth · ${client.name ?? client.id}`,
            prefix: OAUTH_TOKEN_PREFIX,
            hashedSecret: hashSecret(secret),
            partialKey: secret.slice(-4),
            scopes,
            allowedEnvironmentIds: u.allowedEnvironmentIds ?? undefined,
            clientId: client.id,
            oauthGrantId: u.grantId,
            isActive: true,
            expiresAt: token.accessTokenExpiresAt ?? null,
            projects: { create: [{ projectId: u.projectId }] },
          },
        });
      }
    });

    return { ...token, scope: scopes, client, user };
  }

  async getAccessToken(accessToken: string): Promise<Token | Falsey> {
    const secret = accessTokenSecret(accessToken);
    if (!secret) {
      return false;
    }
    const row = await this.prisma.apiToken.findUnique({
      where: { hashedSecret: hashSecret(secret) },
    });
    if (!row || !row.isActive || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) {
      return false;
    }
    return {
      accessToken,
      accessTokenExpiresAt: row.expiresAt ?? undefined,
      scope: (row.scopes as string[]) ?? [],
      client: { id: row.clientId ?? '', grants: [] },
      user: { id: row.userId } as User,
    };
  }

  async getRefreshToken(refreshToken: string): Promise<RefreshToken | Falsey> {
    const fingerprint = tokenFingerprint(refreshToken);
    if (!fingerprint) {
      return false;
    }
    const grant = await this.prisma.oAuthGrant.findUnique({
      where: { hashedRefreshToken: fingerprint },
    });
    if (
      !grant ||
      grant.revokedAt ||
      (grant.refreshExpiresAt && grant.refreshExpiresAt.getTime() <= Date.now())
    ) {
      return false;
    }
    const client = await this.getClient(grant.clientId, '');
    if (!client) {
      return false;
    }
    return {
      refreshToken,
      refreshTokenExpiresAt: grant.refreshExpiresAt ?? undefined,
      scope: (grant.scopes as string[]) ?? [],
      client,
      user: {
        id: grant.userId,
        projectId: grant.projectId,
        grantId: grant.id,
        allowedEnvironmentIds: (grant.allowedEnvironmentIds as string[] | null) ?? null,
      } as OAuthUser,
    };
  }

  async revokeToken(_token: RefreshToken): Promise<boolean> {
    // Rotation: the new refresh hash is written by saveToken on the same grant id,
    // so the old refresh no longer resolves. Nothing to do here but acknowledge.
    return true;
  }
}
