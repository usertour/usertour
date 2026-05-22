import { NoPermissionError } from '@/common/errors';

/**
 * Identifies how to resolve the owning project for a guarded endpoint.
 *
 * The authoritative project is always **derived from the resource** the
 * request targets (or, for create/list endpoints, taken from the explicit
 * projectId/environmentId argument). A client-supplied projectId is only
 * ever used as a cross-check — never trusted on its own.
 *
 * One kind per resource family. Each old per-module guard collapses into
 * one resolver here; the shared membership + capability check lives in
 * PermissionGuard. Kinds are added as each module migrates in P2.
 */
export enum ScopeKind {
  /** projectId is an explicit argument (project-level create/list with no resource). */
  Project = 'project',
  /** environmentId is an explicit argument; project = environment.projectId. */
  Environment = 'environment',
  /** content/version id → environmentId → project. */
  Content = 'content',
  // Project-level entities: entity id → entity.projectId, else explicit projectId.
  Attribute = 'attribute',
  Theme = 'theme',
  Event = 'event',
  Localization = 'localization',
}

/** A resolver returns the owning projectId for the request, or null if unresolvable. */
export type ScopeResolver = (args: Record<string, any>) => Promise<string | null>;

/**
 * Lookups the resolvers need, kept minimal and explicit so resolvers stay
 * unit-testable. PermissionGuard backs these with Prisma; tests pass fakes.
 */
export interface ScopeServices {
  /** projectId of a project-level entity row (e.g. attribute, theme) by id. */
  getEntityProjectId: (model: string, id: string) => Promise<string | null>;
  /** projectId of an environment by id. */
  getEnvironmentProjectId: (environmentId: string) => Promise<string | null>;
  /** environmentId a content belongs to. */
  getContentEnvironmentId: (contentId: string) => Promise<string | null>;
  /** environmentId a content version belongs to. */
  getVersionEnvironmentId: (versionId: string) => Promise<string | null>;
}

const argProjectId = (args: Record<string, any>): string | undefined =>
  args.projectId || args.data?.projectId || args.query?.projectId;

const argEnvironmentId = (args: Record<string, any>): string | undefined =>
  args.environmentId || args.data?.environmentId || args.query?.environmentId || args.data?.id;

/** Verify any client-supplied projectId matches the derived one (cross-project-IDOR guard). */
const crossCheck = (args: Record<string, any>, projectId: string): string => {
  const claimed = argProjectId(args);
  if (claimed && claimed !== projectId) {
    throw new NoPermissionError();
  }
  return projectId;
};

/**
 * Project-level entity (attribute, theme, event, localization, ...): resolve
 * via the entity id when present (update/delete), else fall back to the
 * explicit projectId argument (create/list).
 */
const projectLevelEntity =
  (model: string, services: ScopeServices): ScopeResolver =>
  async (args) => {
    // Entity id is passed as `id` / `data.id` (attribute, localization) or as
    // `<model>Id` (e.g. themeId, eventId).
    const id = args.id || args.data?.id || args[`${model}Id`];
    if (id) {
      const projectId = await services.getEntityProjectId(model, id);
      return projectId ? crossCheck(args, projectId) : null;
    }
    return argProjectId(args) ?? null;
  };

const fromEnvironment =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    const environmentId = argEnvironmentId(args);
    if (!environmentId) {
      return null;
    }
    const projectId = await services.getEnvironmentProjectId(environmentId);
    return projectId ? crossCheck(args, projectId) : null;
  };

const fromContent =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    const contentId = args.contentId || args.query?.contentId || args.data?.contentId;
    const versionId = args.versionId || args.query?.versionId || args.data?.versionId;
    let environmentId = argEnvironmentId(args);
    if (!environmentId && contentId) {
      environmentId = (await services.getContentEnvironmentId(contentId)) ?? undefined;
    }
    if (!environmentId && versionId) {
      environmentId = (await services.getVersionEnvironmentId(versionId)) ?? undefined;
    }
    if (!environmentId) {
      return null;
    }
    const projectId = await services.getEnvironmentProjectId(environmentId);
    return projectId ? crossCheck(args, projectId) : null;
  };

export const createScopeResolvers = (
  services: ScopeServices,
): Record<ScopeKind, ScopeResolver> => ({
  [ScopeKind.Project]: async (args) => argProjectId(args) ?? null,
  [ScopeKind.Environment]: fromEnvironment(services),
  [ScopeKind.Content]: fromContent(services),
  [ScopeKind.Attribute]: projectLevelEntity('attribute', services),
  [ScopeKind.Theme]: projectLevelEntity('theme', services),
  [ScopeKind.Event]: projectLevelEntity('event', services),
  [ScopeKind.Localization]: projectLevelEntity('localization', services),
});
