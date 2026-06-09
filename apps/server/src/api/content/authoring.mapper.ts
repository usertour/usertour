import { ApiObjectType } from '../shared/object-type';
import { AuthoringStep } from './authoring.schema';

/** Internal step row, untyped at the relation boundary (generic Prisma include). */
type StepNode = {
  id: string;
  cvid: string | null;
  name: string | null;
  type: string | null;
  sequence: number;
};

/**
 * Decompile an internal step into the slim authoring step (Phase 1). Phase 2
 * extends this to also produce `target` / `placement` / `content` / `triggers`.
 */
export function decompileStep(step: StepNode): AuthoringStep {
  return {
    object: ApiObjectType.STEP,
    id: step.id,
    cvid: step.cvid ?? null,
    name: step.name ?? '',
    type: step.type ?? '',
    sequence: step.sequence,
  };
}
