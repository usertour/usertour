import { ContentVersion } from '../content-representation/representation.schema';
import { ApiObjectType } from '../shared/object-type';
import { Content, ContentExpand } from './content.schema';

type VersionNode = {
  id: string;
  sequence: number;
  themeId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

/** Pure version -> API content-version (the slim form embedded in content; questions empty here). */
export function mapContentVersion(version: VersionNode): ContentVersion {
  return {
    id: version.id,
    object: ApiObjectType.CONTENT_VERSION,
    number: version.sequence,
    themeId: version.themeId ?? null,
    questions: [],
    updatedAt: version.updatedAt.toISOString(),
    createdAt: version.createdAt.toISOString(),
  };
}

/**
 * Pure domain-content -> API content mapping (no DI, unit-testable). The generic
 * Prisma include erases relation types upstream, so `node` is untyped here;
 * `editedVersion` and each environment's `publishedVersion` are only inlined when
 * the corresponding expand is requested.
 */
export function mapContent(node: any, expand: ContentExpand[]): Content {
  return {
    id: node.id,
    object: ApiObjectType.CONTENT,
    name: node.name,
    type: node.type,
    buildUrl: node.buildUrl ?? null,
    editedVersionId: node.editedVersionId,
    deleted: Boolean(node.deleted),
    editedVersion:
      expand.includes('editedVersion') && node.editedVersion
        ? mapContentVersion(node.editedVersion)
        : undefined,
    environments: (node.contentOnEnvironments ?? []).map((coe: any) => ({
      environmentId: coe.environmentId,
      published: coe.published,
      publishedVersionId: coe.publishedVersionId,
      publishedAt: coe.publishedAt.toISOString(),
      publishedVersion:
        expand.includes('publishedVersion') && coe.publishedVersion
          ? mapContentVersion(coe.publishedVersion)
          : undefined,
    })),
    updatedAt: node.updatedAt.toISOString(),
    createdAt: node.createdAt.toISOString(),
  };
}
