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
 * PermissionGuard. P1 ships the reference resolvers below; the remaining
 * kinds are registered as each module migrates in P2.
 */
export enum ScopeKind {
  /** projectId is an explicit argument (project-level create/list). */
  Project = 'project',
  /** environmentId is an explicit argument; project = environment.projectId. */
  Environment = 'environment',
  /** content/version id → environmentId → project. */
  Content = 'content',
}

/** A resolver returns the owning projectId for the request, or null if unresolvable. */
export type ScopeResolver = (args: Record<string, any>) => Promise<string | null>;

/** Service surface the resolvers need. Kept minimal and explicit so resolvers stay unit-testable. */
export interface ScopeServices {
  getEnvironmentProjectId: (environmentId: string) => Promise<string | null>;
  getContentEnvironmentId: (contentId: string) => Promise<string | null>;
  getVersionEnvironmentId: (versionId: string) => Promise<string | null>;
}

const argProjectId = (args: Record<string, any>): string | undefined =>
  args.projectId || args.data?.projectId || args.query?.projectId;

const argEnvironmentId = (args: Record<string, any>): string | undefined =>
  args.environmentId || args.data?.environmentId || args.query?.environmentId || args.data?.id;

/**
 * Resolve via environment, then verify any client-supplied projectId matches
 * the derived one (the cross-project-IDOR guard the old guards enforced).
 */
const fromEnvironment = (services: ScopeServices): ScopeResolver => {
  return async (args) => {
    const environmentId = argEnvironmentId(args);
    if (!environmentId) {
      return null;
    }
    const projectId = await services.getEnvironmentProjectId(environmentId);
    if (!projectId) {
      return null;
    }
    const claimed = argProjectId(args);
    if (claimed && claimed !== projectId) {
      throw new NoPermissionError();
    }
    return projectId;
  };
};

export const createScopeResolvers = (
  services: ScopeServices,
): Record<ScopeKind, ScopeResolver> => ({
  [ScopeKind.Project]: async (args) => argProjectId(args) ?? null,

  [ScopeKind.Environment]: fromEnvironment(services),

  [ScopeKind.Content]: async (args) => {
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
    if (!projectId) {
      return null;
    }
    const claimed = argProjectId(args);
    if (claimed && claimed !== projectId) {
      throw new NoPermissionError();
    }
    return projectId;
  },
});
