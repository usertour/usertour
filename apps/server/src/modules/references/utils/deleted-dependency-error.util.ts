import { DeletedDependencyRestoreError } from '@/modules/common/errors/errors';

import type { DeletedReference } from '../types/deleted-reference.type';
import { referenceDetails } from './reference-details.util';

/** The refusal to restore something whose conditions use deleted definitions. */
export const deletedDependencyRestoreError = (
  what: 'segment' | 'theme',
  dependencies: DeletedReference[],
): DeletedDependencyRestoreError => {
  const listed = dependencies
    .map(
      (dependency) =>
        `${dependency.kind} "${dependency.name || dependency.id}" (id ${dependency.id})`,
    )
    .join(', ');
  const error = new DeletedDependencyRestoreError(
    `Cannot restore this ${what}: its conditions use deleted definitions: ${listed}. Restore them first, then restore this ${what}.`,
  );
  error.details = referenceDetails(
    dependencies.map((dependency) => ({
      kind: dependency.kind,
      name: dependency.name || dependency.id,
    })),
  );
  return error;
};
