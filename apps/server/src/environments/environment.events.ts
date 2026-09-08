/**
 * Emitted (and awaited) right before an environment is deleted, so modules
 * the environments module cannot import — integrations, which imports biz,
 * which imports environments — can tear down what they own for it first.
 */
export const ENVIRONMENT_DELETING = 'environment.deleting';

export interface EnvironmentDeletingPayload {
  environmentId: string;
}
