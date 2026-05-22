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
  /** segment id (various arg shapes) → segment.projectId. */
  Segment = 'segment',
  /** session id → session.content.environmentId → project. */
  Session = 'session',
  /** integration id / object-mapping id → integration.environmentId → project. */
  Integration = 'integration',
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
  /** environmentId the content owning a step belongs to. */
  getStepEnvironmentId: (stepId: string) => Promise<string | null>;
  /** environmentId a session belongs to (via its content). */
  getSessionEnvironmentId: (sessionId: string) => Promise<string | null>;
  /** environmentId an integration belongs to. */
  getIntegrationEnvironmentId: (integrationId: string) => Promise<string | null>;
  /** environmentId an integration object mapping belongs to (via its integration). */
  getMappingEnvironmentId: (mappingId: string) => Promise<string | null>;
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

// Content uses an explicit environmentId arg (never data.id) and lets the
// content/version/step entity it targets override that arg — mirroring the
// old content guard's precedence.
const contentArgEnvironmentId = (args: Record<string, any>): string | undefined =>
  args.environmentId || args.data?.environmentId || args.query?.environmentId;

const fromContent =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    const contentId = args.contentId || args.query?.contentId || args.data?.contentId;
    const versionId = args.versionId || args.query?.versionId || args.data?.versionId;
    const stepId = args.stepId;
    let environmentId = contentArgEnvironmentId(args);
    if (contentId) {
      environmentId = (await services.getContentEnvironmentId(contentId)) ?? environmentId;
    }
    if (versionId) {
      environmentId = (await services.getVersionEnvironmentId(versionId)) ?? environmentId;
    }
    if (stepId) {
      environmentId = (await services.getStepEnvironmentId(stepId)) ?? environmentId;
    }
    if (!environmentId) {
      return null;
    }
    const projectId = await services.getEnvironmentProjectId(environmentId);
    if (!projectId) {
      return null;
    }
    // Duplicate-to-another-environment: the target must be in the same project.
    const targetEnvironmentId = args.data?.targetEnvironmentId;
    if (targetEnvironmentId) {
      const targetProjectId = await services.getEnvironmentProjectId(targetEnvironmentId);
      if (!targetProjectId || targetProjectId !== projectId) {
        throw new NoPermissionError();
      }
    }
    // Localization referenced in the request must belong to the same project.
    const localizationId =
      args.localizationId || args.data?.localizationId || args.query?.localizationId;
    if (localizationId) {
      const localizationProjectId = await services.getEntityProjectId(
        'localization',
        localizationId,
      );
      if (localizationProjectId && localizationProjectId !== projectId) {
        throw new NoPermissionError();
      }
    }
    return crossCheck(args, projectId);
  };

const fromSession =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    const sessionId = args.sessionId || args.query?.sessionId || args.data?.sessionId;
    if (!sessionId) {
      return null;
    }
    const environmentId = await services.getSessionEnvironmentId(sessionId);
    if (!environmentId) {
      return null;
    }
    const projectId = await services.getEnvironmentProjectId(environmentId);
    return projectId ? crossCheck(args, projectId) : null;
  };

const fromSegment =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    const segmentId =
      args.data?.id ||
      args.data?.segmentId ||
      args.data?.userOnSegment?.[0]?.segmentId ||
      args.data?.companyOnSegment?.[0]?.segmentId;
    if (!segmentId) {
      return null;
    }
    const projectId = await services.getEntityProjectId('segment', segmentId);
    return projectId ? crossCheck(args, projectId) : null;
  };

const fromIntegration =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    // integrationId-keyed endpoints, else object-mapping id-keyed endpoints.
    const integrationId = args.integrationId || args.data?.integrationId;
    const mappingId = args.id || args.data?.id;
    let environmentId: string | null = null;
    if (integrationId) {
      environmentId = await services.getIntegrationEnvironmentId(integrationId);
    } else if (mappingId) {
      environmentId = await services.getMappingEnvironmentId(mappingId);
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
  [ScopeKind.Segment]: fromSegment(services),
  [ScopeKind.Session]: fromSession(services),
  [ScopeKind.Integration]: fromIntegration(services),
});
