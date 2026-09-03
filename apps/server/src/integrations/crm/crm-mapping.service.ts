import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { Attribute, Integration, IntegrationObjectMapping, Prisma } from '@prisma/client';
import { CRM_INTEGRATION_PROVIDERS } from '@usertour/constants';
import type {
  CrmInboundField,
  CrmLocalObject,
  CrmMatchStrategy,
  CrmOutboundField,
  CrmRemoteObject,
} from '@usertour/types';
import { codeName as codeNameSchema } from '@/api/shared/codename';
import { ValidationError } from '@/common/errors/errors';
import { ProjectCacheService } from '@/shared/project-cache.service';
import { CrmConnectionService } from './crm-connection.service';
import { CrmJournalService } from './crm-journal.service';
import { CrmSyncService } from './crm-sync.service';
import {
  attributeBizTypeFor,
  hubspotObjectTypeFor,
  isRemotePropertyWritable,
  isSupportedObjectPair,
  localDataTypeFor,
  remotePropertyNameFor,
} from './crm-mapping.types';
import { type HubspotProperty, listHubspotProperties } from './hubspot-crm-api';

/** GraphQL projection of a provider property (metadata for the mapping editor). */
export interface CrmRemotePropertyView {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  groupName: string;
  readOnly: boolean;
  hubspotDefined: boolean;
}

export interface UpsertMappingInput {
  integrationId: string;
  remoteObject: string;
  localObject: string;
  matchStrategy: string;
  matchRemoteField?: string | null;
  inboundFields: CrmInboundField[];
  outboundFields: Array<{ local: string }>;
  enabled?: boolean;
  /** Take over existing internal attributes named in inboundFields (ADR 0013 §6). */
  adoptExisting?: boolean;
}

type IntegrationWithProject = Integration & { environment: { projectId: string } };

/**
 * Object mappings (ADR 0013 §4-6): the per-pair configuration and the
 * attribute-ownership bookkeeping that goes with it. Inbound fields become
 * provider-owned attribute definitions (created or adopted here, released on
 * unmap); outbound fields are validated against Usertour-owned attributes and
 * get their provider property name assigned. Record syncing lives in the
 * sync service; this one only shapes the configuration.
 */
@Injectable()
export class CrmMappingService {
  private readonly logger = new Logger(CrmMappingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: CrmConnectionService,
    private readonly cache: ProjectCacheService,
    private readonly sync: CrmSyncService,
    private readonly journal: CrmJournalService,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async listMappings(integrationId: string): Promise<IntegrationObjectMapping[]> {
    await this.loadCrmIntegration(integrationId);
    return await this.prisma.integrationObjectMapping.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Provider property metadata for the editor's pickers (live, not cached). */
  async listRemoteProperties(
    integrationId: string,
    remoteObject: string,
  ): Promise<CrmRemotePropertyView[]> {
    const integration = await this.loadCrmIntegration(integrationId);
    this.assertConnected(integration);
    const remote = this.assertRemoteObject(remoteObject);
    const properties = await this.fetchRemoteProperties(integration, remote);
    return properties
      .map((property) => ({
        name: property.name,
        label: property.label,
        type: property.type,
        fieldType: property.fieldType,
        groupName: property.groupName,
        readOnly: !isRemotePropertyWritable(property),
        hubspotDefined: !!property.hubspotDefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async upsertMapping(input: UpsertMappingInput): Promise<IntegrationObjectMapping> {
    const integration = await this.loadCrmIntegration(input.integrationId);
    await this.connections.assertEntitled(integration.environmentId);
    this.assertConnected(integration);
    const remoteObject = this.assertRemoteObject(input.remoteObject);
    const localObject = input.localObject as CrmLocalObject;
    if (!isSupportedObjectPair(remoteObject, localObject)) {
      throw new ValidationError(
        `"${remoteObject}" cannot be mapped to "${input.localObject}" — supported pairs: contact ↔ user, company ↔ company.`,
      );
    }
    const matchStrategy = this.assertMatchStrategy(input, remoteObject);
    const inboundFields = this.normalizeInbound(input.inboundFields);
    const outboundLocals = this.normalizeLocals(input.outboundFields.map((field) => field.local));
    const overlap = inboundFields.filter((field) => outboundLocals.includes(field.local));
    if (overlap.length > 0) {
      throw new ValidationError(
        `"${overlap[0].local}" cannot be both synced from and written back to the provider.`,
      );
    }

    // Every remote name the mapping references must exist on the provider.
    const referencedRemote = [
      ...inboundFields.map((field) => field.remote),
      ...(matchStrategy === 'remoteField' ? [input.matchRemoteField as string] : []),
    ];
    const remoteProperties =
      referencedRemote.length > 0
        ? await this.fetchRemoteProperties(integration, remoteObject)
        : [];
    const remoteByName = new Map(remoteProperties.map((property) => [property.name, property]));
    for (const name of referencedRemote) {
      if (!remoteByName.has(name)) {
        throw new ValidationError(`Provider property "${name}" does not exist.`);
      }
    }

    const projectId = integration.environment.projectId;
    const bizType = attributeBizTypeFor(localObject);
    const existing = await this.prisma.integrationObjectMapping.findUnique({
      where: {
        integrationId_remoteObject_localObject: {
          integrationId: integration.id,
          remoteObject,
          localObject,
        },
      },
    });
    const previousInbound = existing
      ? (existing.inboundFields as unknown as CrmInboundField[])
      : [];

    const row = await this.prisma.$transaction(async (tx) => {
      await this.claimInboundAttributes(tx, {
        projectId,
        bizType,
        provider: integration.provider,
        fields: inboundFields,
        remoteByName,
        adoptExisting: !!input.adoptExisting,
      });
      await this.releaseAttributes(tx, {
        projectId,
        bizType,
        provider: integration.provider,
        codeNames: previousInbound
          .map((field) => field.local)
          .filter((local) => !inboundFields.some((field) => field.local === local)),
      });
      const outboundFields = await this.resolveOutbound(tx, {
        projectId,
        bizType,
        localObject,
        locals: outboundLocals,
      });
      const data = {
        matchStrategy,
        matchRemoteField: matchStrategy === 'remoteField' ? input.matchRemoteField : null,
        inboundFields: inboundFields as unknown as Prisma.InputJsonArray,
        outboundFields: outboundFields as unknown as Prisma.InputJsonArray,
        enabled: input.enabled ?? true,
      };
      return existing
        ? await tx.integrationObjectMapping.update({ where: { id: existing.id }, data })
        : await tx.integrationObjectMapping.create({
            data: { integrationId: integration.id, remoteObject, localObject, ...data },
          });
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(projectId));
    // A changed field list needs a backfill; a full round is the backfill.
    // Best-effort: a queue hiccup must not fail the save.
    try {
      await this.sync.startFullSync(row.id, { manual: false });
    } catch (error) {
      this.logger.warn(
        `Could not start the full sync after saving mapping ${row.id}: ${(error as Error).message}`,
      );
    }
    return row;
  }

  /** Remove a mapping (links cascade); its provider-owned attributes become ordinary again. */
  async deleteMapping(input: { integrationId: string; id: string }): Promise<boolean> {
    const integration = await this.loadCrmIntegration(input.integrationId);
    const mapping = await this.prisma.integrationObjectMapping.findUnique({
      where: { id: input.id },
    });
    if (!mapping || mapping.integrationId !== integration.id) {
      throw new ValidationError('Mapping not found.');
    }
    const projectId = integration.environment.projectId;
    await this.prisma.$transaction(async (tx) => {
      await this.releaseAttributes(tx, {
        projectId,
        bizType: attributeBizTypeFor(mapping.localObject as CrmLocalObject),
        provider: integration.provider,
        codeNames: (mapping.inboundFields as unknown as CrmInboundField[]).map(
          (field) => field.local,
        ),
      });
      await tx.integrationObjectMapping.delete({ where: { id: mapping.id } });
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(projectId));
    await this.afterMappingChange(integration.id, null);
    return true;
  }

  /**
   * Post-save side effects, best-effort — a queue or provider hiccup must not
   * fail the save: the change journal subscription follows the new field
   * lists, and a changed mapping backfills through a full round.
   */
  private async afterMappingChange(integrationId: string, mappingId: string | null): Promise<void> {
    try {
      await this.journal.syncSubscriptions(integrationId);
    } catch (error) {
      this.logger.warn(
        `Could not update the change subscriptions for integration ${integrationId}: ${(error as Error).message}`,
      );
    }
    if (!mappingId) {
      return;
    }
    try {
      await this.sync.startFullSync(mappingId, { manual: false });
    } catch (error) {
      this.logger.warn(
        `Could not start the full sync after saving mapping ${mappingId}: ${(error as Error).message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Attribute ownership (ADR 0013 §6)
  // ---------------------------------------------------------------------------

  /**
   * Make every inbound field a provider-owned attribute: create it, keep it
   * (same provider), or adopt an existing internal one when the caller
   * confirmed and the data type matches. Anything else is refused so a
   * mapping can never silently take over a customer's attribute.
   */
  private async claimInboundAttributes(
    tx: Prisma.TransactionClient,
    params: {
      projectId: string;
      bizType: number;
      provider: string;
      fields: CrmInboundField[];
      remoteByName: Map<string, HubspotProperty>;
      adoptExisting: boolean;
    },
  ): Promise<void> {
    const { projectId, bizType, provider, fields, remoteByName, adoptExisting } = params;
    if (fields.length === 0) {
      return;
    }
    const existingRows = await tx.attribute.findMany({
      where: { projectId, bizType, codeName: { in: fields.map((field) => field.local) } },
    });
    const existingByCode = new Map(existingRows.map((row) => [row.codeName, row]));
    for (const field of fields) {
      const remote = remoteByName.get(field.remote) as HubspotProperty;
      const dataType = localDataTypeFor(remote);
      const current = existingByCode.get(field.local);
      if (!current) {
        await tx.attribute.create({
          data: {
            projectId,
            bizType,
            codeName: field.local,
            displayName: remote.label || field.local,
            dataType,
            source: provider,
            sourceId: field.remote,
          },
        });
        continue;
      }
      if (current.deleted) {
        throw new ValidationError(
          `Attribute "${field.local}" was deleted; choose another attribute name.`,
        );
      }
      if (current.source !== 'internal' && current.source !== provider) {
        throw new ValidationError(
          `Attribute "${field.local}" is owned by another integration (${current.source}).`,
        );
      }
      if (current.dataType !== dataType) {
        throw new ValidationError(
          `Attribute "${field.local}" has a different data type than provider property "${field.remote}".`,
        );
      }
      if (current.source === 'internal' && !adoptExisting) {
        throw new ValidationError(
          `Attribute "${field.local}" already exists. Confirm adopting it as a ${provider}-owned attribute, or map to a new name.`,
        );
      }
      if (current.source !== provider || current.sourceId !== field.remote) {
        await tx.attribute.update({
          where: { id: current.id },
          data: { source: provider, sourceId: field.remote },
        });
      }
    }
  }

  /** Hand provider-owned attributes back: they keep their values, lose the badge and the write guard. */
  private async releaseAttributes(
    tx: Prisma.TransactionClient,
    params: { projectId: string; bizType: number; provider: string; codeNames: string[] },
  ): Promise<void> {
    if (params.codeNames.length === 0) {
      return;
    }
    await tx.attribute.updateMany({
      where: {
        projectId: params.projectId,
        bizType: params.bizType,
        source: params.provider,
        codeName: { in: params.codeNames },
      },
      data: { source: 'internal', sourceId: null },
    });
  }

  /** Outbound fields must name Usertour-owned attributes; the remote name is assigned here. */
  private async resolveOutbound(
    tx: Prisma.TransactionClient,
    params: { projectId: string; bizType: number; localObject: CrmLocalObject; locals: string[] },
  ): Promise<CrmOutboundField[]> {
    if (params.locals.length === 0) {
      return [];
    }
    const rows = await tx.attribute.findMany({
      where: {
        projectId: params.projectId,
        bizType: params.bizType,
        codeName: { in: params.locals },
        deleted: false,
      },
    });
    const byCode = new Map(rows.map((row) => [row.codeName, row]));
    return params.locals.map((local) => {
      const attribute = byCode.get(local) as Attribute | undefined;
      if (!attribute) {
        throw new ValidationError(`Attribute "${local}" does not exist.`);
      }
      if (attribute.source !== 'internal') {
        throw new ValidationError(
          `Attribute "${local}" is owned by ${attribute.source} and cannot be written back.`,
        );
      }
      return { local, remote: remotePropertyNameFor(params.localObject, local) };
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async loadCrmIntegration(integrationId: string): Promise<IntegrationWithProject> {
    const row = await this.prisma.integration.findUnique({
      where: { id: integrationId },
      include: { environment: { select: { projectId: true } } },
    });
    if (!row) {
      throw new ValidationError('Integration not found.');
    }
    if (
      !CRM_INTEGRATION_PROVIDERS.includes(
        row.provider as (typeof CRM_INTEGRATION_PROVIDERS)[number],
      )
    ) {
      throw new ValidationError(`"${row.provider}" is not a CRM integration.`);
    }
    return row;
  }

  private assertConnected(integration: Integration): void {
    if (!integration.oauthCredentials) {
      throw new ValidationError('Connect the integration before configuring mappings.');
    }
  }

  private assertRemoteObject(value: string): CrmRemoteObject {
    if (value !== 'contact' && value !== 'company') {
      throw new ValidationError(`Unknown provider object "${value}".`);
    }
    return value;
  }

  private assertMatchStrategy(
    input: UpsertMappingInput,
    remoteObject: CrmRemoteObject,
  ): CrmMatchStrategy {
    const strategy = input.matchStrategy as CrmMatchStrategy;
    if (strategy !== 'email' && strategy !== 'remoteField') {
      throw new ValidationError(`Unknown match strategy "${input.matchStrategy}".`);
    }
    if (strategy === 'email' && remoteObject === 'company') {
      throw new ValidationError(
        'Companies can only be matched by a provider property holding the company id.',
      );
    }
    if (strategy === 'remoteField' && !input.matchRemoteField?.trim()) {
      throw new ValidationError('Choose the provider property that holds the Usertour id.');
    }
    return strategy;
  }

  private normalizeInbound(fields: CrmInboundField[]): CrmInboundField[] {
    const seen = new Set<string>();
    const result: CrmInboundField[] = [];
    for (const field of fields) {
      const remote = field.remote?.trim();
      const local = field.local?.trim();
      if (!remote || !local) {
        throw new ValidationError(
          'Each synced field needs a provider property and an attribute name.',
        );
      }
      const parsed = codeNameSchema.safeParse(local);
      if (!parsed.success) {
        throw new ValidationError(
          `Invalid attribute name "${local}": ${parsed.error.issues[0]?.message}`,
        );
      }
      if (seen.has(local)) {
        throw new ValidationError(`Attribute "${local}" is mapped twice.`);
      }
      seen.add(local);
      result.push({ remote, local });
    }
    return result;
  }

  private normalizeLocals(locals: string[]): string[] {
    const result: string[] = [];
    for (const raw of locals) {
      const local = raw?.trim();
      if (!local) {
        throw new ValidationError('Each write-back field needs an attribute name.');
      }
      if (!result.includes(local)) {
        result.push(local);
      }
    }
    return result;
  }

  private async fetchRemoteProperties(
    integration: Integration,
    remoteObject: CrmRemoteObject,
  ): Promise<HubspotProperty[]> {
    const token = await this.connections.getAccessToken(integration.id);
    return await listHubspotProperties(token, hubspotObjectTypeFor(remoteObject));
  }
}
