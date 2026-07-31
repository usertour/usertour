import { ContentVersion } from '../content-representation/representation.schema';
import { ApiObjectType } from '../shared/object-type';
import { Content, ContentExpand } from './content.schema';

/**
 * Pure domain-content -> API content mapping (no DI, unit-testable). The generic
 * Prisma include erases relation types upstream, so `node` is untyped here;
 * `editedVersion` and each environment's `publishedVersion` are only inlined when
 * the corresponding expand is requested.
 *
 * `mapVersionNode` renders those inline versions. The service passes the SAME
 * mapping the standalone content-versions endpoint uses (rules decompiled,
 * questions null = not requested), so an inline version is a faithful
 * `get_content_version` without its expands. A hand-rolled slim copy here once
 * dropped `firstPublishedAt`/`startRules` and hardcoded `questions: []` (an
 * audit caught the drift) — don't re-grow one.
 */
export function mapContent(
  node: any,
  expand: ContentExpand[],
  mapVersionNode: (version: any) => ContentVersion,
): Content {
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
        ? mapVersionNode(node.editedVersion)
        : undefined,
    environments: (node.contentOnEnvironments ?? []).map((coe: any) => ({
      environmentId: coe.environmentId,
      published: coe.published,
      publishedVersionId: coe.publishedVersionId,
      publishedAt: coe.publishedAt.toISOString(),
      publishedVersion:
        expand.includes('publishedVersion') && coe.publishedVersion
          ? mapVersionNode(coe.publishedVersion)
          : undefined,
    })),
    updatedAt: node.updatedAt.toISOString(),
    createdAt: node.createdAt.toISOString(),
  };
}
