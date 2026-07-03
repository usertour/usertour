import { AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { InitThemeInput } from '@/themes/dto/theme.input';
import { Prisma } from '@prisma/client';
import { ColumnSetting, EventAttributes, UserAttributes, CompanyAttributes } from '@usertour/types';
import {
  defaultAttributes,
  defaultEvents,
  defaultSettings,
  standardDarkSettings,
} from '@usertour/constants';

export const initializationThemes: InitThemeInput[] = [
  {
    name: 'Standard Light',
    settings: { ...defaultSettings },
    isDefault: true,
    isSystem: true,
  },
  {
    name: 'Standard Dark',
    settings: { ...standardDarkSettings },
    isDefault: false,
    isSystem: true,
  },
];

// Two-step "diff then batch insert" replaces a loop of per-row upserts so
// project initialization runs in a couple of round-trips instead of one
// round-trip per default. We deliberately skip the original upsert's
// "update displayName/description" branch — those values only drift when
// the defaultAttributes constant itself changes, which is rare enough to
// handle via a one-off migration if it ever matters.
const initializationAttributes = async (tx: Prisma.TransactionClient, projectId: string) => {
  const existing = await tx.attribute.findMany({
    where: { projectId },
    select: { bizType: true, codeName: true },
  });
  const existingKeys = new Set(existing.map((a) => `${a.bizType}:${a.codeName}`));
  const toCreate = defaultAttributes
    .filter((attr) => !existingKeys.has(`${attr.bizType}:${attr.codeName}`))
    .map((attr) => ({ ...attr, projectId, predefined: true }));
  if (toCreate.length === 0) {
    return;
  }
  await tx.attribute.createMany({ data: toCreate as any, skipDuplicates: true });
};

const initializationEvents = async (tx: Prisma.TransactionClient, projectId: string) => {
  const existing = await tx.event.findMany({
    where: { projectId },
    select: { codeName: true },
  });
  const existingKeys = new Set(existing.map((e) => e.codeName));
  const toCreate = defaultEvents
    .filter((event) => !existingKeys.has(event.codeName))
    .map((event) => ({
      displayName: event.displayName,
      codeName: event.codeName,
      description: event.description,
      projectId,
      predefined: true,
    }));
  if (toCreate.length === 0) {
    return;
  }
  await tx.event.createMany({ data: toCreate, skipDuplicates: true });
};

const initializationAttributeOnEvent = async (tx: Prisma.TransactionClient, projectId: string) => {
  const attributes = await tx.attribute.findMany({
    where: { bizType: AttributeBizType.EVENT, predefined: true, projectId },
  });
  const events = await tx.event.findMany({ where: { projectId } });

  // Get existing relationships
  const existingRelations = await tx.attributeOnEvent.findMany({
    where: {
      event: { projectId },
      attribute: { projectId },
    },
    select: { attributeId: true, eventId: true },
  });

  // Create a Set of existing relations for easy lookup
  const existingRelationSet = new Set(
    existingRelations.map((rel) => `${rel.attributeId}-${rel.eventId}`),
  );

  const inserts = [];
  for (const defaultEvent of defaultEvents) {
    const event = events.find((e) => e.codeName === defaultEvent.codeName);
    if (!event) continue;

    for (const attr of attributes) {
      if (defaultEvent.attributes.includes(attr.codeName as EventAttributes)) {
        const relationKey = `${attr.id}-${event.id}`;
        // Only add if relation doesn't exist
        if (!existingRelationSet.has(relationKey)) {
          inserts.push({ attributeId: attr.id, eventId: event.id });
        }
      }
    }
  }

  if (inserts.length > 0) {
    await tx.attributeOnEvent.createMany({ data: inserts, skipDuplicates: true });
  }
};

// KEEP IN SYNC: apps/server/prisma/project-defaults.ts's initializeProject
// mirrors this per-project logic for the deploy-time backfill (it can't import
// from src — production doesn't ship src). The default DATA is shared via
// @usertour/constants, so only these diff/insert mechanics are duplicated.
export const initialization = async (tx: Prisma.TransactionClient, projectId: string) => {
  await initializationAttributes(tx, projectId);
  await initializationEvents(tx, projectId);
  await initializationAttributeOnEvent(tx, projectId);
};

export interface DefaultSegmentInput {
  name: string;
  bizType: SegmentBizType;
  dataType: SegmentDataType;
  data: any[];
  columns?: ColumnSetting[];
}

/**
 * Generate default columns configuration based on segment bizType
 */
export function getDefaultColumns(bizType: SegmentBizType): ColumnSetting[] {
  if (bizType === SegmentBizType.USER) {
    return [
      { codeName: UserAttributes.EMAIL, visible: true },
      { codeName: UserAttributes.LAST_SEEN_AT, visible: true },
      { codeName: UserAttributes.SIGNED_UP_AT, visible: true },
    ];
  }
  if (bizType === SegmentBizType.COMPANY) {
    return [
      { codeName: CompanyAttributes.LAST_SEEN_AT, visible: true },
      { codeName: CompanyAttributes.SIGNED_UP_AT, visible: true },
    ];
  }
  return [];
}

/**
 * Get default segments configuration for project initialization
 */
export function getDefaultSegments(): DefaultSegmentInput[] {
  return [
    {
      name: 'All Users',
      bizType: SegmentBizType.USER,
      dataType: SegmentDataType.ALL,
      data: [],
      columns: getDefaultColumns(SegmentBizType.USER),
    },
    {
      name: 'All Companies',
      bizType: SegmentBizType.COMPANY,
      dataType: SegmentDataType.ALL,
      data: [],
      columns: getDefaultColumns(SegmentBizType.COMPANY),
    },
  ];
}
