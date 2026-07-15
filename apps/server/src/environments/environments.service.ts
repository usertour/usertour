import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { CreateEnvironmentInput, UpdateEnvironmentInput } from './dto/environment.input';
import {
  IdentityVerificationRequiresActiveSecretError,
  LastEnvironmentCannotBeDeletedError,
  ParamsError,
  PrimaryEnvironmentCannotBeDeletedError,
  SigningSecretLimitReachedError,
} from '@/common/errors';
import { CreateAccessTokenInput } from './dto/access-token.dto';
import { ProjectCacheService } from '@/shared/project-cache.service';
import { ProjectsService } from '@/projects/projects.service';
import { EncryptionService } from '@/shared/encryption.service';
import {
  IdentityVerificationService,
  SIGNING_SECRET_PREFIX,
  VerificationStats,
} from '@/shared/identity-verification.service';

/** Steady-state secret plus one rotation slot (ADR 0008) */
const MAX_ACTIVE_SIGNING_SECRETS = 2;

/**
 * The signing-secret invariants (≤2 active per environment; enforcement
 * requires ≥1 active) are count-then-write checks that SQL constraints can't
 * express, so their transactions run SERIALIZABLE — a concurrent conflicting
 * write makes Postgres reject one side instead of silently breaking the
 * invariant.
 */
const SIGNING_SECRET_TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

/**
 * Serialization failures (P2034) are transient by design — Postgres asks the
 * loser to retry. Re-running the transaction re-executes the invariant
 * checks against the winner's committed state, so a legitimate conflict
 * (e.g. the second of two concurrent creates hitting the cap) surfaces as
 * the proper domain error instead of a raw Prisma error.
 */
const SERIALIZATION_FAILURE_RETRIES = 2;

@Injectable()
export class EnvironmentsService {
  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
    private readonly projectsService: ProjectsService,
    private readonly identityVerificationService: IdentityVerificationService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Whether the environment has received any SDK data yet (at least one
   * BizUser, i.e. usertour.identify() has run). Powers the Installation page's
   * "verify installation" check.
   */
  async verifyInstallation(
    environmentId: string,
  ): Promise<{ installed: boolean; userCount: number }> {
    const userCount = await this.prisma.bizUser.count({ where: { environmentId } });
    return { installed: userCount > 0, userCount };
  }

  async create(newData: CreateEnvironmentInput) {
    return await this.prisma.$transaction(async (tx) => {
      await this.projectsService.checkEnvironmentLimit(newData.projectId, tx);

      // Check if there's already a primary environment in the project
      const primaryEnvCount = await tx.environment.count({
        where: {
          projectId: newData.projectId,
          isPrimary: true,
          deleted: false,
        },
      });

      // If no primary environment exists, set this one as primary
      const isPrimary = primaryEnvCount === 0;

      return await tx.environment.create({
        data: {
          ...newData,
          isPrimary,
        },
      });
    });
  }

  async update(input: UpdateEnvironmentInput) {
    return await this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findUnique({
        where: { id: input.id },
      });
      if (!env) {
        throw new ParamsError();
      }

      const updateData: { name: string; isPrimary?: boolean } = {
        name: input.name,
      };

      // If isPrimary is being set to true, ensure no other environment is primary
      if (input.isPrimary === true) {
        // Unset primary flag from other environments in the same project
        await tx.environment.updateMany({
          where: {
            projectId: env.projectId,
            id: { not: env.id },
            isPrimary: true,
            deleted: false,
          },
          data: { isPrimary: false },
        });
        updateData.isPrimary = true;
      } else if (input.isPrimary === false) {
        // Allow setting to false regardless of whether there are other primary environments
        // Projects can exist without a primary environment
        // Only update if current environment is actually primary
        if (env.isPrimary === true) {
          updateData.isPrimary = false;
        }
        // If current environment is not primary, ignore the request (don't update isPrimary field)
      }

      return await tx.environment.update({
        where: { id: env.id },
        data: updateData,
      });
    });
  }

  async delete(id: string) {
    // Fetch contentIds before the tx so we can sweep per-content pubver
    // cache keys after the COE rows are gone — same shape as deleteContent.
    const coeContentIds = (
      await this.prisma.contentOnEnvironment.findMany({
        where: { environmentId: id },
        select: { contentId: true },
      })
    ).map((c) => c.contentId);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Get the environment to find its projectId
      const environment = await tx.environment.findUnique({
        where: { id },
      });

      if (!environment) {
        throw new ParamsError();
      }

      // Check if this is the primary environment
      if (environment.isPrimary) {
        throw new PrimaryEnvironmentCannotBeDeletedError();
      }

      // Check if there is only one environment in the project
      const environmentCount = await tx.environment.count({
        where: {
          projectId: environment.projectId,
          deleted: false,
        },
      });

      if (environmentCount <= 1) {
        throw new LastEnvironmentCannotBeDeletedError();
      }

      if (coeContentIds.length > 0) {
        await tx.contentOnEnvironment.deleteMany({
          where: { environmentId: id },
        });
      }

      // Update environment to mark as deleted
      return await tx.environment.update({
        where: { id },
        data: { deleted: true },
      });
    });

    // Invalidate every cache slice keyed by this env: the per-type Content
    // slice and the per-content publishedVersionId mapping. Otherwise an
    // SDK still authenticated against this env's token would keep serving
    // its (now-orphaned) content for up to PROJECT_CONFIG_TTL_SECONDS.
    const keys = [
      ...this.cache.envContentKeys(id),
      ...coeContentIds.map((cid) => this.cache.keys.publishedVersionId(id, cid)),
    ];
    await this.cache.invalidate(keys);

    return updated;
  }

  async get(id: string) {
    return await this.prisma.environment.findUnique({
      where: { id },
    });
  }

  async listEnvsByProjectId(projectId: string) {
    return await this.prisma.environment.findMany({
      where: { projectId, deleted: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  // AccessToken related methods
  async createAccessToken(environmentId: string, input: CreateAccessTokenInput) {
    return this.prisma.accessToken.create({
      data: {
        name: input.name,
        description: input.description,
        environmentId,
        isActive: true,
      },
    });
  }

  async findAllAccessTokens(environmentId: string) {
    return this.prisma.accessToken.findMany({
      where: {
        environmentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneAccessToken(environmentId: string, id: string) {
    const accessToken = await this.prisma.accessToken.findUnique({
      where: { id, environmentId },
    });

    if (!accessToken) {
      throw new ParamsError('Access token not found');
    }

    return accessToken;
  }

  async removeAccessToken(environmentId: string, id: string) {
    await this.findOneAccessToken(environmentId, id);

    return this.prisma.accessToken.delete({
      where: { id },
    });
  }

  // Identity verification (ADR 0008): signing secret lifecycle + enforcement.
  // Secrets are AES-256-GCM encrypted at rest (same treatment as
  // User.twoFactorSecret): HMAC verification needs the original value, so
  // hashing is impossible by construction — encryption bounds a DB-only leak.

  private async runSigningSecretTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, SIGNING_SECRET_TX_OPTIONS);
      } catch (error) {
        const isSerializationFailure =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!isSerializationFailure || attempt >= SERIALIZATION_FAILURE_RETRIES) {
          throw error;
        }
      }
    }
  }

  async createSigningSecret(environmentId: string) {
    // `utv_` (identity Verification) joins the `ut?_` credential prefix
    // family from the API token work; `uts_` is already reserved there for
    // service accounts.
    const secret = `${SIGNING_SECRET_PREFIX}${randomBytes(32).toString('base64url')}`;
    const created = await this.runSigningSecretTransaction(async (tx) => {
      const activeCount = await tx.environmentSigningSecret.count({
        where: { environmentId, revokedAt: null },
      });
      if (activeCount >= MAX_ACTIVE_SIGNING_SECRETS) {
        throw new SigningSecretLimitReachedError();
      }
      return await tx.environmentSigningSecret.create({
        data: {
          environmentId,
          secret: this.encryptionService.encrypt(secret),
        },
      });
    });
    return { ...created, secret };
  }

  async listActiveSigningSecrets(environmentId: string) {
    const signingSecrets = await this.prisma.environmentSigningSecret.findMany({
      where: { environmentId, revokedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return signingSecrets.map((signingSecret) => ({
      ...signingSecret,
      secret: this.encryptionService.decrypt(signingSecret.secret) ?? '',
    }));
  }

  async getSigningSecret(environmentId: string, id: string) {
    const signingSecret = await this.prisma.environmentSigningSecret.findUnique({
      where: { id, environmentId },
    });
    if (!signingSecret || signingSecret.revokedAt) {
      throw new ParamsError('Signing secret not found');
    }
    return {
      ...signingSecret,
      secret: this.encryptionService.decrypt(signingSecret.secret) ?? '',
    };
  }

  async revokeSigningSecret(environmentId: string, id: string) {
    return await this.runSigningSecretTransaction(async (tx) => {
      const signingSecret = await tx.environmentSigningSecret.findUnique({
        where: { id, environmentId },
      });
      if (!signingSecret || signingSecret.revokedAt) {
        throw new ParamsError('Signing secret not found');
      }

      // Anti-lockout: revoking the last active secret while enforcement is on
      // would invalidate every signed identify and take the SDK down for all
      // non-anonymous users.
      const environment = await tx.environment.findUnique({ where: { id: environmentId } });
      if (environment?.requireIdentityVerification) {
        const activeCount = await tx.environmentSigningSecret.count({
          where: { environmentId, revokedAt: null },
        });
        if (activeCount <= 1) {
          throw new IdentityVerificationRequiresActiveSecretError();
        }
      }

      return await tx.environmentSigningSecret.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    });
  }

  async setRequireIdentityVerification(environmentId: string, required: boolean) {
    return await this.runSigningSecretTransaction(async (tx) => {
      const environment = await tx.environment.findUnique({ where: { id: environmentId } });
      if (!environment) {
        throw new ParamsError();
      }

      // Anti-lockout: enforcement with no active secret would reject every
      // non-anonymous identify.
      if (required) {
        const activeCount = await tx.environmentSigningSecret.count({
          where: { environmentId, revokedAt: null },
        });
        if (activeCount === 0) {
          throw new IdentityVerificationRequiresActiveSecretError();
        }
      }

      return await tx.environment.update({
        where: { id: environmentId },
        data: { requireIdentityVerification: required },
      });
    });
  }

  async getIdentityVerificationStats(environmentId: string): Promise<VerificationStats[]> {
    return await this.identityVerificationService.getVerificationStats(environmentId);
  }

  async validateIdentityToken(environmentId: string, token: string) {
    return await this.identityVerificationService.diagnoseIdentityToken(environmentId, token);
  }
}
