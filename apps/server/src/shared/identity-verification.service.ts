import { Injectable, Logger } from '@nestjs/common';
import { JsonWebTokenError, JwtService, NotBeforeError, TokenExpiredError } from '@nestjs/jwt';
import { Environment, EnvironmentSigningSecret } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { EncryptionService } from './encryption.service';
import { RedisService } from './redis.service';

/**
 * SDK identity verification (ADR 0008, token format amended by ADR 0009).
 *
 * The environment token is public, so identity claims arriving over the SDK
 * surface are proven with a JWT minted by the customer's backend and signed
 * (HS256) with a per-environment signing secret:
 *
 *   { sub: externalUserId, companyId?: externalCompanyId, exp?: ... }
 *
 * `sub` is required and must match the claimed user. `companyId` asserts
 * membership of that company. `exp` is optional — when present it is
 * enforced, bounding replay of a leaked token.
 *
 * Verification runs in both enforcement modes — when enforcement is off the
 * verdict only feeds the coverage counters, so a customer can watch signed
 * traffic reach 100% before flipping enforcement on.
 */

export type SignatureSubject = 'user' | 'company';

export type SignatureVerdict =
  /** Token present, signature matches an active secret, claims match. */
  | 'valid'
  /** Token present but unverifiable (bad signature, expired, claim mismatch). */
  | 'invalid'
  /** No token supplied. */
  | 'missing'
  /** Unsigned, but the user id is an SDK-generated anonymous id (exempt). */
  | 'anonymous';

/**
 * Claims we read from a verified identity token. Extra claims are ignored.
 * `sub`/`companyId` are typed unknown because customer JWT libraries may emit
 * them as JSON numbers — comparison always goes through claimMatches.
 */
export interface IdentityTokenPayload {
  sub?: unknown;
  companyId?: unknown;
  exp?: number;
}

/** Console validator result (settings page "Validate token" tool). */
export interface IdentityTokenDiagnosis {
  status:
    | 'valid'
    | 'expired'
    | 'not_yet_valid'
    | 'invalid_signature'
    | 'wrong_algorithm'
    | 'malformed'
    | 'missing_subject'
    | 'no_active_secret';
  subject?: string;
  companyId?: string;
  expiresAt?: Date;
}

/**
 * Single-token verification outcome shared by the runtime and validator
 * paths, so both always classify a token identically.
 */
type TokenCheck =
  | { status: 'valid'; payload: IdentityTokenPayload }
  | { status: 'expired' | 'not_yet_valid'; payload: IdentityTokenPayload | null }
  | { status: 'invalid_signature' }
  | { status: 'wrong_algorithm' }
  | { status: 'malformed' }
  | { status: 'no_active_secret' };

/**
 * Prefix for environment signing secrets, part of the `ut?_` credential
 * prefix family (`utp_` personal API token, `uto_` OAuth access token,
 * `utr_` OAuth refresh token, `uts_` reserved for service accounts).
 * `utv_` = identity Verification. The customer uses the full prefixed string
 * as the HS256 signing key.
 */
export const SIGNING_SECRET_PREFIX = 'utv_';

/**
 * SDK-generated anonymous ids: `anon-` + UUID v4 (see identifyAnonymous in
 * apps/sdk). Only ids in exactly this shape may skip the identity token —
 * anything else unsigned is treated as an unproven identity claim.
 *
 * Deliberately NOT relaxed to bare UUIDs (the pre-2025-11 anonymous format):
 * customers whose real user ids are UUIDs would have those users silently
 * exempted, punching a hole in enforcement. Legacy anonymous ids are instead
 * migrated in the SDK (identifyAnonymous deterministically upgrades a stored
 * bare UUID to `anon-<uuid>`), which the CDN-distributed runtime rolls out
 * automatically.
 */
const ANONYMOUS_USER_ID_PATTERN =
  /^anon-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Upper bound on an identity token accepted for verification. Mirrors the
 * UpsertCompanyPayload @MaxLength — the handshake path is unauthenticated
 * (the environment token is public), so oversized tokens must be rejected
 * before any decode/decrypt work.
 */
const MAX_IDENTITY_TOKEN_LENGTH = 4096;

/**
 * Clock-skew tolerance for exp/nbf checks. Customer backends signing tokens
 * a second or two ahead of our clock must not be classified as invalid.
 */
const CLOCK_TOLERANCE_SECONDS = 30;

/** A secret's lastUsedAt is persisted at most once per this window. */
const LAST_USED_WRITE_INTERVAL_SECONDS = 60;

/** Daily verification counters retention; the console reads a 7-day window. */
const VERIFICATION_STATS_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface VerificationStats {
  subject: SignatureSubject;
  valid: number;
  invalid: number;
  missing: number;
  anonymous: number;
}

export const isAnonymousExternalUserId = (externalUserId: string): boolean => {
  return ANONYMOUS_USER_ID_PATTERN.test(externalUserId);
};

/**
 * Claim comparison with string coercion: customer JWT libraries commonly emit
 * numeric ids as JSON numbers, while the SDK always sends string ids.
 */
const claimMatches = (claim: unknown, expected: string): boolean => {
  return claim != null && String(claim) === expected;
};

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly encryptionService: EncryptionService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Verify a user identity claim. Counts the verdict into the environment's
   * daily coverage stats regardless of enforcement mode.
   */
  async verifyUserIdentity(
    environmentId: string,
    externalUserId: string,
    token: string | undefined,
  ): Promise<SignatureVerdict> {
    let verdict: SignatureVerdict;
    if (!token) {
      verdict = isAnonymousExternalUserId(externalUserId) ? 'anonymous' : 'missing';
    } else {
      const check = await this.checkToken(environmentId, token, { touchLastUsed: true });
      verdict =
        check.status === 'valid' && claimMatches(check.payload.sub, externalUserId)
          ? 'valid'
          : 'invalid';
    }
    this.recordVerdict(environmentId, 'user', verdict);
    return verdict;
  }

  /**
   * Verify a company membership claim: the token must prove the user identity
   * AND carry a matching companyId claim. Anonymous users can hold no
   * membership proof, so an unsigned claim is always 'missing'.
   */
  async verifyCompanyMembership(
    environmentId: string,
    externalUserId: string,
    externalCompanyId: string,
    token: string | undefined,
  ): Promise<SignatureVerdict> {
    let verdict: SignatureVerdict;
    if (!token) {
      verdict = 'missing';
    } else {
      const check = await this.checkToken(environmentId, token, { touchLastUsed: true });
      verdict =
        check.status === 'valid' &&
        claimMatches(check.payload.sub, externalUserId) &&
        claimMatches(check.payload.companyId, externalCompanyId)
          ? 'valid'
          : 'invalid';
    }
    this.recordVerdict(environmentId, 'company', verdict);
    return verdict;
  }

  /**
   * Whether a verdict lets the claim through under the environment's
   * enforcement mode. With enforcement off, everything passes (verdicts only
   * feed the coverage stats); enforced, only proven identities and
   * SDK-anonymous users do.
   */
  isAcceptable(verdict: SignatureVerdict, requireIdentityVerification: boolean): boolean {
    if (!requireIdentityVerification) {
      return true;
    }
    return verdict === 'valid' || verdict === 'anonymous';
  }

  /**
   * Connection-level gate for the socket handshake: the claimed user identity
   * must be proven, and when a company id is claimed its membership must be
   * too — an unproven company claim would leak company-targeted content to
   * non-members. The token is verified once; both verdicts derive from the
   * same payload and both are counted. Logs the rejection reason; callers
   * only branch on the boolean.
   */
  async verifyConnectionIdentity(
    environment: Pick<Environment, 'id' | 'requireIdentityVerification'>,
    externalUserId: string,
    externalCompanyId: string | undefined,
    identityToken: string | undefined,
  ): Promise<boolean> {
    let userVerdict: SignatureVerdict;
    let companyVerdict: SignatureVerdict | undefined;
    let checkStatus: TokenCheck['status'] | undefined;

    if (!identityToken) {
      userVerdict = isAnonymousExternalUserId(externalUserId) ? 'anonymous' : 'missing';
      companyVerdict = externalCompanyId ? 'missing' : undefined;
    } else {
      const check = await this.checkToken(environment.id, identityToken, { touchLastUsed: true });
      checkStatus = check.status;
      const payload = check.status === 'valid' ? check.payload : null;
      const userProven = payload !== null && claimMatches(payload.sub, externalUserId);
      userVerdict = userProven ? 'valid' : 'invalid';
      if (externalCompanyId) {
        companyVerdict =
          userProven && claimMatches(payload.companyId, externalCompanyId) ? 'valid' : 'invalid';
      }
    }

    this.recordVerdict(environment.id, 'user', userVerdict);
    if (companyVerdict) {
      this.recordVerdict(environment.id, 'company', companyVerdict);
    }

    if (!this.isAcceptable(userVerdict, environment.requireIdentityVerification)) {
      this.logger.warn(
        `[WS] Rejecting connection for user ${externalUserId} in environment ${environment.id}: identity token verdict=${userVerdict}${checkStatus ? ` (${checkStatus})` : ''}`,
      );
      return false;
    }
    if (
      companyVerdict &&
      !this.isAcceptable(companyVerdict, environment.requireIdentityVerification)
    ) {
      this.logger.warn(
        `[WS] Rejecting connection for user ${externalUserId} in environment ${environment.id}: company claim verdict=${companyVerdict} for company ${externalCompanyId}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Message-level gate for group(): the token's companyId claim must match
   * the claimed company.
   */
  async verifyGroupClaim(
    environment: Pick<Environment, 'id' | 'requireIdentityVerification'>,
    externalUserId: string,
    externalCompanyId: string,
    identityToken: string | undefined,
  ): Promise<boolean> {
    const membershipVerdict = await this.verifyCompanyMembership(
      environment.id,
      externalUserId,
      externalCompanyId,
      identityToken,
    );
    if (!this.isAcceptable(membershipVerdict, environment.requireIdentityVerification)) {
      this.logger.warn(
        `[WS] Rejecting company claim for user ${externalUserId} in environment ${environment.id}: company claim verdict=${membershipVerdict} for company ${externalCompanyId}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Detailed single-token check for the console's validator tool. Shares the
   * exact classification path with runtime verification, reports WHY a token
   * fails, and neither counts coverage nor touches lastUsedAt.
   */
  async diagnoseIdentityToken(
    environmentId: string,
    token: string,
  ): Promise<IdentityTokenDiagnosis> {
    const check = await this.checkToken(environmentId, token, { touchLastUsed: false });
    switch (check.status) {
      case 'valid': {
        if (check.payload.sub == null) {
          return { status: 'missing_subject', ...this.decodedClaims(check.payload) };
        }
        return { status: 'valid', ...this.decodedClaims(check.payload) };
      }
      case 'expired':
      case 'not_yet_valid':
        return { status: check.status, ...this.decodedClaims(check.payload) };
      default:
        return { status: check.status };
    }
  }

  /**
   * Aggregate the last `days` daily counter buckets (UTC) for the console's
   * coverage display.
   */
  async getVerificationStats(environmentId: string, days = 7): Promise<VerificationStats[]> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();
    const now = Date.now();
    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      pipeline.hgetall(this.statsKey(environmentId, new Date(now - dayIndex * 86_400_000)));
    }
    const results = (await pipeline.exec()) ?? [];

    const totals: Record<SignatureSubject, VerificationStats> = {
      user: { subject: 'user', valid: 0, invalid: 0, missing: 0, anonymous: 0 },
      company: { subject: 'company', valid: 0, invalid: 0, missing: 0, anonymous: 0 },
    };
    for (const [error, bucket] of results) {
      if (error || !bucket) {
        continue;
      }
      for (const [field, count] of Object.entries(bucket as Record<string, string>)) {
        const [subject, verdict] = field.split(':') as [SignatureSubject, SignatureVerdict];
        if (totals[subject] && totals[subject][verdict] !== undefined) {
          totals[subject][verdict] += Number(count);
        }
      }
    }
    return [totals.user, totals.company];
  }

  /**
   * Classify one token against the environment's active secrets. The single
   * source of truth for both runtime verification and the console validator —
   * they must never disagree.
   */
  private async checkToken(
    environmentId: string,
    token: string,
    options: { touchLastUsed: boolean },
  ): Promise<TokenCheck> {
    // The handshake path is unauthenticated; bound the work an arbitrary
    // token can cause before any decode/decrypt happens.
    if (token.length > MAX_IDENTITY_TOKEN_LENGTH) {
      this.logger.warn(
        `Oversized identity token (${token.length} chars) in environment ${environmentId}`,
      );
      return { status: 'malformed' };
    }

    // Structural check first, so garbage input classifies as malformed even
    // when the environment has no active secret to verify against.
    const decoded = this.decodePayload(token);
    if (decoded === null) {
      return { status: 'malformed' };
    }

    const activeSecrets = await this.activeSecrets(environmentId);
    if (activeSecrets.length === 0) {
      return { status: 'no_active_secret' };
    }

    for (const signingSecret of activeSecrets) {
      // Secrets are AES-256-GCM encrypted at rest; the signing key is the
      // decrypted `utv_...` string exactly as the customer holds it.
      const secretValue = this.encryptionService.decrypt(signingSecret.secret);
      if (!secretValue) {
        this.logger.error(`Failed to decrypt signing secret ${signingSecret.id}; skipping`);
        continue;
      }
      try {
        const payload = this.jwtService.verify<IdentityTokenPayload>(token, {
          secret: secretValue,
          algorithms: ['HS256'],
          clockTolerance: CLOCK_TOLERANCE_SECONDS,
        });
        if (options.touchLastUsed) {
          this.touchLastUsed(signingSecret);
        }
        return { status: 'valid', payload };
      } catch (error) {
        // exp/nbf are checked only after the signature verifies: the customer
        // is signing with this secret, so record the use and stop trying.
        if (error instanceof TokenExpiredError || error instanceof NotBeforeError) {
          if (options.touchLastUsed) {
            this.touchLastUsed(signingSecret);
          }
          const status = error instanceof TokenExpiredError ? 'expired' : 'not_yet_valid';
          this.logger.warn(`Identity token ${status} in environment ${environmentId}`);
          return { status, payload: decoded };
        }
        if (error instanceof JsonWebTokenError && error.message === 'invalid algorithm') {
          // Structurally fine but signed with a non-HS256 algorithm (several
          // JWT libraries default to RS256) — point the customer at the
          // algorithm, not the token format.
          return { status: 'wrong_algorithm' };
        }
        if (error instanceof JsonWebTokenError && error.message !== 'invalid signature') {
          return { status: 'malformed' };
        }
        // Bad signature — try the next active secret.
      }
    }
    return { status: 'invalid_signature' };
  }

  private async activeSecrets(environmentId: string): Promise<EnvironmentSigningSecret[]> {
    return await this.prisma.environmentSigningSecret.findMany({
      where: { environmentId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  private decodePayload(token: string): IdentityTokenPayload | null {
    const decoded = this.jwtService.decode(token);
    return decoded && typeof decoded === 'object' ? (decoded as IdentityTokenPayload) : null;
  }

  private decodedClaims(
    payload: IdentityTokenPayload | null,
  ): Omit<IdentityTokenDiagnosis, 'status'> {
    if (!payload) {
      return {};
    }
    return {
      subject: payload.sub != null ? String(payload.sub) : undefined,
      companyId: payload.companyId != null ? String(payload.companyId) : undefined,
      expiresAt: payload.exp != null ? new Date(payload.exp * 1000) : undefined,
    };
  }

  /**
   * Persist lastUsedAt for a matched secret, throttled through a Redis NX key
   * so the handshake path issues at most one UPDATE per secret per interval.
   * Fire-and-forget: rotation observability must not add latency or failure
   * modes to verification.
   */
  private touchLastUsed(signingSecret: EnvironmentSigningSecret): void {
    const throttleKey = `signing-secret:${signingSecret.id}:last-used-touched`;
    this.redis
      .getClient()
      .set(throttleKey, '1', 'EX', LAST_USED_WRITE_INTERVAL_SECONDS, 'NX')
      .then(async (acquired) => {
        if (acquired) {
          await this.prisma.environmentSigningSecret.update({
            where: { id: signingSecret.id },
            data: { lastUsedAt: new Date() },
          });
        }
      })
      .catch((error) => {
        this.logger.warn(`Failed to touch lastUsedAt for secret ${signingSecret.id}: ${error}`);
      });
  }

  private recordVerdict(
    environmentId: string,
    subject: SignatureSubject,
    verdict: SignatureVerdict,
  ): void {
    const key = this.statsKey(environmentId, new Date());
    const client = this.redis.getClient();
    client
      .pipeline()
      .hincrby(key, `${subject}:${verdict}`, 1)
      .expire(key, VERIFICATION_STATS_TTL_SECONDS)
      .exec()
      .catch((error) => {
        this.logger.warn(`Failed to record verification stats for ${environmentId}: ${error}`);
      });
  }

  private statsKey(environmentId: string, date: Date): string {
    const day = date.toISOString().slice(0, 10);
    return `env:${environmentId}:identity-verification:stats:${day}`;
  }
}
