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
  /** sso provider id → provider.projectId, else explicit projectId. */
  Sso = 'sso',
  /** webhook id → webhook.environmentId → project, else explicit environmentId. */
  Webhook = 'webhook',
}

/**
 * What a resolver derives from the request: the owning project, plus any
 * environment(s) the request implicitly ACTS ON that were resolved as a
 * byproduct of the same row lookup (integration/mapping/session). The guard's
 * membership environment-ceiling check consumes `environmentIds` directly, so
 * the env is never re-queried — and a new arg shape added to a resolver can't
 * silently skip the ceiling.
 */
export interface ScopeResolution {
  projectId: string;
  environmentIds?: string[];
}

/** A resolver returns the request's scope resolution, or null if unresolvable. */
export type ScopeResolver = (args: Record<string, any>) => Promise<ScopeResolution | null>;

/**
 * Lookups the resolvers need, kept minimal and explicit so resolvers stay
 * unit-testable. PermissionGuard backs these with Prisma; tests pass fakes.
 */
export interface ScopeServices {
  /** projectId of a project-level entity row (e.g. attribute, theme) by id. */
  getEntityProjectId: (model: string, id: string) => Promise<string | null>;
  /** projectId of an environment by id. */
  getEnvironmentProjectId: (environmentId: string) => Promise<string | null>;
  /** projectId a content belongs to (content is project-level; `environmentId` is legacy). */
  getContentProjectId: (contentId: string) => Promise<string | null>;
  /** projectId a content version belongs to (via its content). */
  getVersionProjectId: (versionId: string) => Promise<string | null>;
  /** projectId the content owning a step belongs to (via version → content). */
  getStepProjectId: (stepId: string) => Promise<string | null>;
  /** project (via content) + environment a session belongs to, in ONE lookup. */
  getSessionScope: (
    sessionId: string,
  ) => Promise<{ projectId: string | null; environmentId: string | null } | null>;
  /** environmentId an integration belongs to. */
  getIntegrationEnvironmentId: (integrationId: string) => Promise<string | null>;
  /** environmentId an integration object mapping belongs to (via its integration). */
  getMappingEnvironmentId: (mappingId: string) => Promise<string | null>;
  /** environmentId a webhook belongs to. */
  getWebhookEnvironmentId: (webhookId: string) => Promise<string | null>;
}

const argProjectId = (args: Record<string, any>): string | undefined =>
  args.projectId || args.data?.projectId || args.query?.projectId;

const argEnvironmentId = (args: Record<string, any>): string | undefined =>
  args.environmentId || args.data?.environmentId || args.query?.environmentId || args.data?.id;

/** Verify any client-supplied projectId matches the derived one (cross-project-IDOR guard). */
const crossCheck = (
  args: Record<string, any>,
  projectId: string,
  environmentIds?: string[],
): ScopeResolution => {
  const claimed = argProjectId(args);
  if (claimed && claimed !== projectId) {
    throw new NoPermissionError();
  }
  return { projectId, ...(environmentIds?.length ? { environmentIds } : {}) };
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
    const explicit = argProjectId(args);
    return explicit ? { projectId: explicit } : null;
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

// Content is project-level. Operating on an existing content/version/step
// resolves its project directly (content.projectId); create/list endpoints
// instead carry an explicit environmentId whose project owns the new content.
const contentArgEnvironmentId = (args: Record<string, any>): string | undefined =>
  args.environmentId || args.data?.environmentId || args.query?.environmentId;

const fromContent =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    const contentId = args.contentId || args.query?.contentId || args.data?.contentId;
    const versionId = args.versionId || args.query?.versionId || args.data?.versionId;
    const stepId = args.stepId;

    let projectId: string | null = null;
    if (contentId) {
      projectId = await services.getContentProjectId(contentId);
    } else if (versionId) {
      projectId = await services.getVersionProjectId(versionId);
    } else if (stepId) {
      projectId = await services.getStepProjectId(stepId);
    } else {
      // create/list: project is whoever owns the target environment.
      const environmentId = contentArgEnvironmentId(args);
      projectId = environmentId ? await services.getEnvironmentProjectId(environmentId) : null;
    }
    if (!projectId) {
      return null;
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
    const scope = await services.getSessionScope(sessionId);
    if (!scope?.projectId) {
      return null;
    }
    // The session's own environment rides along for the membership env ceiling.
    return crossCheck(args, scope.projectId, scope.environmentId ? [scope.environmentId] : []);
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
    // The integration/mapping's environment rides along for the env ceiling.
    return projectId ? crossCheck(args, projectId, [environmentId]) : null;
  };

const fromWebhook =
  (services: ScopeServices): ScopeResolver =>
  async (args) => {
    // webhook-id-keyed endpoints (update/delete/rotate/detail/deliveries) …
    const webhookId = args.webhookId || args.data?.webhookId || args.id || args.data?.id;
    let environmentId: string | null = null;
    if (webhookId) {
      environmentId = await services.getWebhookEnvironmentId(webhookId);
    } else {
      // … else create/list, which carry an explicit environmentId.
      environmentId = args.environmentId || args.data?.environmentId || null;
    }
    if (!environmentId) {
      return null;
    }
    const projectId = await services.getEnvironmentProjectId(environmentId);
    // The webhook's environment rides along for the membership env ceiling.
    return projectId ? crossCheck(args, projectId, [environmentId]) : null;
  };

export const createScopeResolvers = (
  services: ScopeServices,
): Record<ScopeKind, ScopeResolver> => ({
  [ScopeKind.Project]: async (args) => {
    const projectId = argProjectId(args);
    return projectId ? { projectId } : null;
  },
  [ScopeKind.Environment]: fromEnvironment(services),
  [ScopeKind.Content]: fromContent(services),
  [ScopeKind.Attribute]: projectLevelEntity('attribute', services),
  [ScopeKind.Theme]: projectLevelEntity('theme', services),
  [ScopeKind.Event]: projectLevelEntity('event', services),
  [ScopeKind.Localization]: projectLevelEntity('localization', services),
  [ScopeKind.Segment]: fromSegment(services),
  [ScopeKind.Session]: fromSession(services),
  [ScopeKind.Integration]: fromIntegration(services),
  [ScopeKind.Sso]: projectLevelEntity('projectSSOIdentityProvider', services),
  [ScopeKind.Webhook]: fromWebhook(services),
});
