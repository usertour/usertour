import { ApiObjectType } from '../shared/object-type';
import type { Environment } from './environments.schema';

type EnvironmentNode = {
  id: string;
  name: string | null;
  isPrimary: boolean;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

/**
 * Pure domain-environment -> API environment. `allowedEnvironmentIds` is the
 * caller credential's effective environment scope (null = all): environments
 * outside it are still listed (discovery) but marked `inTokenScope: false`
 * with the SDK `token` WITHHELD — the token is an ingestion credential
 * (identify/track), so emitting it would hand a scoped caller a usable key
 * to the very environment its scope denies (read-only-credential audit,
 * the one confirmed leak).
 */
export function mapEnvironment(
  node: EnvironmentNode,
  allowedEnvironmentIds: string[] | null = null,
): Environment {
  const inTokenScope = allowedEnvironmentIds === null || allowedEnvironmentIds.includes(node.id);
  return {
    id: node.id,
    object: ApiObjectType.ENVIRONMENT,
    name: node.name,
    isPrimary: node.isPrimary,
    token: inTokenScope ? node.token : null,
    inTokenScope,
    createdAt: new Date(node.createdAt).toISOString(),
    updatedAt: new Date(node.updatedAt).toISOString(),
  };
}
