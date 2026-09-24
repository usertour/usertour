import type { TFunction } from 'i18next';

interface DefinitionReference {
  kind: string;
  name: string;
}

interface ReferenceErrorExtensions {
  code?: unknown;
  references?: DefinitionReference[];
  more?: number;
}

// Server refusals of ADR 0016 that carry a reference list in their extensions:
// deleting a definition live content still uses, and publishing a version that
// uses a deleted definition.
const IN_USE_CODES = new Set(['E1030', 'E1031', 'E1042', 'E1043']);
const DELETED_REFERENCED_CODE = 'E1044';

const firstExtensions = (error: unknown): ReferenceErrorExtensions | undefined =>
  (error as { graphQLErrors?: { extensions?: ReferenceErrorExtensions }[] })?.graphQLErrors?.[0]
    ?.extensions;

const describeReferences = (extensions: ReferenceErrorExtensions, t: TFunction): string => {
  const described = (extensions.references ?? []).map((reference) =>
    t('definitionReferences.reference', {
      kind: t(`definitionReferences.kinds.${reference.kind}`, { defaultValue: reference.kind }),
      name: reference.name,
    }),
  );
  if (extensions.more) {
    described.push(t('definitionReferences.more', { count: extensions.more }));
  }
  return described.join(', ');
};

/**
 * The viewer-language message for a definition in-use or deleted-reference
 * refusal, or undefined when the error is something else.
 */
export const getDefinitionReferenceErrorMessage = (
  error: unknown,
  t: TFunction,
): string | undefined => {
  const extensions = firstExtensions(error);
  if (!extensions || typeof extensions.code !== 'string') {
    return undefined;
  }
  const { code } = extensions;
  if (IN_USE_CODES.has(code)) {
    return t('definitionReferences.inUse', { references: describeReferences(extensions, t) });
  }
  if (code === DELETED_REFERENCED_CODE) {
    return t('definitionReferences.deletedReferenced', {
      references: describeReferences(extensions, t),
    });
  }
  return undefined;
};

/** The error to rethrow: a definition-reference refusal reworded, anything else as is. */
export const localizeDefinitionReferenceError = (error: unknown, t: TFunction): unknown => {
  const message = getDefinitionReferenceErrorMessage(error, t);
  return message ? new Error(message) : error;
};
