import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ContentStepsInput } from './dto/content-steps.input';
import { UpdateContentInput } from './dto/content-update.input';
import { ContentInput, ContentVersionInput } from './dto/content.input';
import { CreateStepInput, UpdateStepInput } from './dto/step.input';
import { VersionUpdateInput } from './dto/version-update.input';
import { VersionUpdateLocalizationInput } from './dto/version.input';
import { WebSocketGateway } from '@/web-socket/web-socket.gateway';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Prisma } from '@prisma/client';
import { ParamsError, UnknownError } from '@/common/errors';
import { regenerateConditionIds } from '@/utils/content-utils';
import { ContentConfigObject } from '@usertour/types';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private webSocketGateway: WebSocketGateway,
  ) {}

  async createContent(input: ContentInput) {
    const { steps = [], name, buildUrl, environmentId, config, data, themeId, type } = input;

    try {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environment) {
        throw new ParamsError();
      }

      return await this.prisma.$transaction(async (tx) => {
        const content = await tx.content.create({
          data: {
            name,
            buildUrl,
            type,
            environmentId,
            projectId: environment.projectId,
          },
        });
        const version = await tx.version.create({
          data: {
            sequence: 0,
            contentId: content.id,
            config,
            data,
            themeId,
            steps: { create: [...steps] },
          } as any,
        });
        await tx.content.update({
          where: { id: content.id },
          data: { editedVersionId: version.id } as any,
        });
        return await tx.content.findUnique({ where: { id: content.id } });
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async updateContent(contentId: string, data: UpdateContentInput) {
    return await this.prisma.content.update({
      where: { id: contentId },
      data: { ...data } as any,
    });
  }

  async addContentSteps(input: ContentStepsInput) {
    const { contentId, versionId, steps, themeId } = input;
    const content = await this.getContent(contentId);
    if (
      !content ||
      !content.editedVersionId ||
      versionId !== content.editedVersionId ||
      content.publishedVersionId === versionId
    ) {
      throw new ParamsError();
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const versionSteps = await tx.step.findMany({ where: { versionId } });
        const deleteStepIds = versionSteps
          .filter((vstep) => !steps.find((pstep) => pstep.id === vstep.id))
          .map((s) => s.id);
        //delete steps
        await tx.step.deleteMany({ where: { id: { in: deleteStepIds } } });
        //up sequence
        for (const step of steps) {
          if (step.id) {
            await tx.step.update({
              where: { id: step.id },
              data: { sequence: step.sequence + 10000 },
            });
          }
        }
        //update or create step
        for (const step of steps) {
          if (step.id) {
            await tx.step.update({
              where: { id: step.id },
              data: { ...step, versionId },
            });
          } else {
            await tx.step.create({ data: { ...step, versionId } });
          }
        }
        //update version
        await tx.version.update({
          where: { id: versionId },
          data: { themeId },
        });
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async addContentStep(data: CreateStepInput) {
    const versionId = data.versionId;
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
    });
    const content = await this.getContent(version.contentId);
    if (!content || content.publishedVersionId === version.id) {
      throw new ParamsError();
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const versionSteps = await tx.step.findMany({
          where: { versionId, sequence: { gte: data.sequence } },
          orderBy: { sequence: 'asc' },
        });
        for (const step of versionSteps) {
          if (step.id) {
            await tx.step.update({
              where: { id: step.id },
              data: { sequence: step.sequence + 10000 },
            });
          }
        }
        for (const step of versionSteps) {
          if (step.id) {
            await tx.step.update({
              where: { id: step.id },
              data: { sequence: step.sequence + 1 },
            });
          }
        }

        // const maxSeq = await tx.step.aggregate({
        //   where: { versionId },
        //   _max: {
        //     sequence: true,
        //   },
        // });
        return await tx.step.create({
          data: { ...data, versionId },
        });
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async updateContentStep(stepId: string, data: UpdateStepInput) {
    const version = await this.prisma.step.findUnique({ where: { id: stepId } }).version();
    const content = await this.getContent(version.contentId);
    if (!content || content.publishedVersionId === version.id) {
      throw new ParamsError();
    }
    return await this.prisma.step.update({
      where: { id: stepId },
      data,
    });
  }

  async getContentByStepId(stepId: string) {
    return await this.prisma.step
      .findUnique({ where: { id: stepId } })
      .version()
      .content();
  }

  async getContentById(contentId: string) {
    return await this.getContent(contentId);
  }

  async createContentVersion(input: ContentVersionInput) {
    const { versionId, steps = [], config, data, themeId } = input;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const oldVersion = await tx.version.findUnique({
          where: {
            id: versionId,
          },
          include: { steps: true },
        });
        const content = await tx.content.findUnique({
          where: { id: oldVersion.contentId },
        });
        const editedVersion = await tx.version.findUnique({
          where: { id: content.editedVersionId },
        });
        const oldSteps = oldVersion.steps.map(
          ({ id, createdAt, updatedAt, versionId, ...step }) => {
            return step;
          },
        );

        const editedConfig = (config || editedVersion.config) as ContentConfigObject;

        const newConfig = {
          ...editedConfig,
          autoStartRules: regenerateConditionIds(editedConfig.autoStartRules),
          hideRules: regenerateConditionIds(editedConfig.hideRules),
        };

        const version = await tx.version.create({
          data: {
            sequence: editedVersion.sequence + 1,
            contentId: content.id,
            config: newConfig,
            data: data || editedVersion.data || {},
            themeId: themeId || editedVersion.themeId || undefined,
            steps: { create: steps.length > 0 ? [...steps] : [...oldSteps] },
          } as any,
        });
        await tx.content.update({
          where: { id: content.id },
          data: { editedVersionId: version.id } as any,
        });
        return version;
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async updateStepsSequence(versionId: string, stepIds: string[]) {
    if (!(await this.contentVersionIsEditable(versionId))) {
      return;
    }
    const steps = await this.prisma.step.findMany({
      where: { id: { in: stepIds }, versionId },
    });
    if (steps.length !== stepIds.length) {
      throw new ParamsError();
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        //up sequence
        for (const step of steps) {
          if (step.id) {
            await tx.step.update({
              where: { id: step.id },
              data: { sequence: step.sequence + 10000 },
            });
          }
        }
        //update or create step
        for (let index = 0; index < steps.length; index++) {
          const step = steps[index];
          if (step.id) {
            await tx.step.update({
              where: { id: step.id },
              data: { ...step, sequence: index },
            });
          }
        }
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async getContentVersionById(versionId: string) {
    return await this.prisma.version.findUnique({
      where: { id: versionId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
  }

  async updateContentVersion(input: VersionUpdateInput) {
    const { versionId, content } = input;
    if (!(await this.contentVersionIsEditable(versionId))) {
      return;
    }
    return await this.prisma.version.update({
      where: { id: versionId },
      data: content,
    });
  }

  async listContentVersions(contentId: string) {
    return await this.prisma.version.findMany({
      where: { contentId },
      orderBy: { sequence: 'desc' },
    });
  }

  async publishedContentVersion(versionId: string, environmentId: string) {
    const version = await this.getContentVersionById(versionId);
    const oldContent = await this.prisma.content.findUnique({
      where: { id: version.contentId },
      include: { contentOnEnvironments: true },
    });
    if (
      oldContent.published &&
      oldContent.publishedVersionId &&
      (!oldContent.contentOnEnvironments || oldContent.contentOnEnvironments.length === 0)
    ) {
      // Update or create ContentOnEnvironment
      await this.prisma.contentOnEnvironment.create({
        data: {
          environmentId: oldContent.environmentId,
          contentId: oldContent.id,
          published: true,
          publishedAt: new Date(),
          publishedVersionId: oldContent.publishedVersionId,
        },
      });
    }

    const content = await this.prisma.$transaction(async (tx) => {
      // Update Content table
      const content = await tx.content.update({
        where: { id: version.contentId },
        data: {
          published: true,
          publishedVersionId: version.id,
          publishedAt: new Date(),
        },
      });

      // Update or create ContentOnEnvironment
      await tx.contentOnEnvironment.upsert({
        where: {
          environmentId_contentId: {
            environmentId: environmentId,
            contentId: content.id,
          },
        },
        create: {
          environmentId: environmentId,
          contentId: content.id,
          published: true,
          publishedAt: new Date(),
          publishedVersionId: version.id,
        },
        update: {
          published: true,
          publishedAt: new Date(),
          publishedVersionId: version.id,
        },
      });

      return content;
    });

    // Send WebSocket notification outside of transaction
    await this.webSocketGateway.notifyContentChanged(environmentId);

    return content;
  }

  async unpublishedContentVersion(contentId: string, environmentId: string) {
    const content = await this.prisma.$transaction(async (tx) => {
      // Update Content table
      const content = await tx.content.update({
        where: { id: contentId },
        data: {
          published: false,
          publishedVersionId: null,
        },
      });

      // Check if ContentOnEnvironment record exists before deleting
      const contentOnEnv = await tx.contentOnEnvironment.findUnique({
        where: {
          environmentId_contentId: {
            environmentId: environmentId,
            contentId: content.id,
          },
        },
      });

      if (contentOnEnv) {
        await tx.contentOnEnvironment.delete({
          where: {
            environmentId_contentId: {
              environmentId: environmentId,
              contentId: content.id,
            },
          },
        });
      }

      return content;
    });

    // send content change notification to all users in the environment
    await this.webSocketGateway.notifyContentChanged(environmentId);
    return content;
  }

  async deleteContent(contentId: string) {
    return await this.prisma.content.update({
      where: { id: contentId },
      data: {
        deleted: true,
      },
    });
  }

  async duplicateContent(contentId: string, name: string, targetEnvironmentId?: string) {
    const duplicateContent = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { environment: true },
    });
    if (!duplicateContent || duplicateContent.deleted) {
      throw new ParamsError();
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const editedVersion = await tx.version.findUnique({
          where: { id: duplicateContent.editedVersionId },
          include: { steps: true },
        });
        // const steps = editedVersion.steps.map(
        //   ({ id, createdAt, updatedAt, versionId, cvid, ...step }) => {
        //     return step;
        //   },
        // );
        const steps = editedVersion.steps.map(
          ({ id, createdAt, updatedAt, versionId, ...step }) => {
            return step;
          },
        );

        const content = await tx.content.create({
          data: {
            name: name || duplicateContent.name,
            buildUrl: duplicateContent.buildUrl,
            environmentId: targetEnvironmentId || duplicateContent.environmentId,
            type: duplicateContent.type,
            projectId: duplicateContent.projectId,
          },
        });

        const config = editedVersion.config as ContentConfigObject;

        const newConfig = {
          ...config,
          autoStartRules: regenerateConditionIds(config.autoStartRules),
          hideRules: regenerateConditionIds(config.hideRules),
        };

        const version = await tx.version.create({
          data: {
            sequence: 0,
            contentId: content.id,
            config: newConfig,
            data: editedVersion.data,
            themeId: editedVersion.themeId,
            steps: { create: [...steps] },
          },
        });
        await tx.content.update({
          where: { id: content.id },
          data: { editedVersionId: version.id },
        });
        return content;
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async restoreContentVersion(versionId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const restoreVersion = await tx.version.findUnique({
          where: {
            id: versionId,
          },
          include: { steps: true },
        });
        const editedVersion = await tx.content
          .findUnique({
            where: { id: restoreVersion.contentId },
          })
          .editedVersion();
        const contentId = restoreVersion.contentId;
        const oldSteps = restoreVersion.steps.map(
          ({ id, createdAt, updatedAt, versionId, ...step }) => {
            return step;
          },
        );

        const version = await tx.version.create({
          data: {
            sequence: editedVersion.sequence + 1,
            contentId: restoreVersion.contentId,
            config: restoreVersion.config,
            data: restoreVersion.data,
            themeId: restoreVersion.themeId,
            steps: { create: [...oldSteps] },
          } as any,
        });
        await tx.content.update({
          where: { id: contentId },
          data: { editedVersionId: version.id },
        });
        return version;
      });
    } catch (_) {
      throw new UnknownError();
    }
  }

  async getEnvironment(id: string) {
    return await this.prisma.environment.findUnique({ where: { id } });
  }

  async getContent(id: string) {
    return await this.prisma.content.findUnique({
      where: { id, deleted: false },
      include: {
        publishedVersion: true,
        contentOnEnvironments: { include: { environment: true, publishedVersion: true } },
      },
    });
  }

  async getContentVersion(id: string) {
    return await this.prisma.version.findUnique({
      where: { id, deleted: false },
      include: { content: true },
    });
  }

  async contentVersionIsEditable(versionId: string) {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId, deleted: false },
    });
    if (!version) {
      throw new ParamsError();
    }
    const contentItem = await this.prisma.content.findUnique({
      where: { id: version.contentId, deleted: false },
      include: { contentOnEnvironments: true },
    });

    const isPublished = contentItem?.contentOnEnvironments?.find(
      (env) => env.published && env.publishedVersionId === versionId,
    );

    if (contentItem.editedVersionId !== versionId || isPublished) {
      throw new ParamsError();
    }

    return true;
  }

  async findManyVersionLocations(versionId: string) {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      include: { content: true },
    });
    const environment = await this.prisma.environment.findUnique({
      where: { id: version.content.environmentId },
    });

    const localizations = await this.prisma.localization.findMany({
      where: { projectId: environment.projectId },
    });

    for (let index = 0; index < localizations.length; index++) {
      const localization = localizations[index];
      const relation = await this.prisma.versionOnLocalization.findFirst({
        where: { versionId, localizationId: localization.id },
      });
      if (!relation) {
        await this.prisma.versionOnLocalization.create({
          data: {
            versionId,
            localizationId: localization.id,
            localized: {},
            backup: {},
          },
        });
      }
    }

    return await this.prisma.versionOnLocalization.findMany({
      where: { versionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertVersionLocationData(input: VersionUpdateLocalizationInput) {
    const { versionId, localizationId, localized, backup, enabled } = input;
    if (!(await this.contentVersionIsEditable(versionId))) {
      throw new ParamsError();
    }
    const relation = await this.prisma.versionOnLocalization.findFirst({
      where: { versionId, localizationId },
    });
    if (!relation) {
      throw new ParamsError();
    }
    return await this.prisma.versionOnLocalization.update({
      where: { id: relation.id },
      data: { localized, backup, enabled },
    });
  }

  async getContentWithRelations(
    id: string,
    projectId: string,
    include?: {
      editedVersion?: boolean;
      publishedVersion?: boolean;
    },
  ) {
    return await this.prisma.content.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        editedVersion: include?.editedVersion ?? false,
        publishedVersion: include?.publishedVersion ?? false,
      },
    });
  }

  async getContentVersionWithRelations(
    versionId: string,
    projectId: string,
    include?: Prisma.VersionInclude,
  ) {
    return await this.prisma.version.findFirst({
      where: {
        id: versionId,
        content: {
          projectId,
        },
      },
      include: {
        content: include?.content,
        steps: include?.steps ? { orderBy: { sequence: 'asc' } } : false,
      },
    });
  }

  async listContentVersionsWithRelations(
    projectId: string,
    contentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.VersionInclude,
    orderBy?: Prisma.VersionOrderByWithRelationInput[],
  ) {
    const baseQuery = {
      where: {
        contentId,
        content: {
          projectId,
        },
      },
      include: {
        content: include?.content,
        steps: include?.steps ? { orderBy: { sequence: 'asc' as const } } : false,
      },
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.version.findMany({ ...baseQuery, ...args }),
      () => this.prisma.version.count({ where: baseQuery.where }),
      paginationArgs,
    );
  }

  async listContentWithRelations(
    projectId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.ContentInclude,
    orderBy?: Prisma.ContentOrderByWithRelationInput[],
  ) {
    const baseQuery = {
      where: { projectId },
      include,
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.content.findMany({ ...baseQuery, ...args }),
      () => this.prisma.content.count({ where: { ...baseQuery.where } }),
      paginationArgs,
    );
  }
}
