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

/** Pure domain-environment -> API environment. */
export function mapEnvironment(node: EnvironmentNode): Environment {
  return {
    id: node.id,
    object: ApiObjectType.ENVIRONMENT,
    name: node.name,
    isPrimary: node.isPrimary,
    token: node.token,
    createdAt: new Date(node.createdAt).toISOString(),
    updatedAt: new Date(node.updatedAt).toISOString(),
  };
}
