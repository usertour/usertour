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
 * outside it are still listed (discovery) but marked `inTokenScope: false`.
 */
export function mapEnvironment(
  node: EnvironmentNode,
  allowedEnvironmentIds: string[] | null = null,
): Environment {
  return {
    id: node.id,
    object: ApiObjectType.ENVIRONMENT,
    name: node.name,
    isPrimary: node.isPrimary,
    token: node.token,
    inTokenScope: allowedEnvironmentIds === null || allowedEnvironmentIds.includes(node.id),
    createdAt: new Date(node.createdAt).toISOString(),
    updatedAt: new Date(node.updatedAt).toISOString(),
  };
}
