import type { DefinitionReference } from '@usertour/types';

interface ReferenceHrefScope {
  projectId: string;
  environmentId: string;
}

/** Where to fix a reference: the referrer's own page. */
export const referenceHref = (reference: DefinitionReference, scope: ReferenceHrefScope) => {
  const { projectId, environmentId } = scope;
  if (reference.referrerKind === 'content') {
    return `/env/${environmentId}/${reference.contentType}s/${reference.id}/detail`;
  }
  if (reference.referrerKind === 'segment') {
    const list = reference.segmentBizType === 'company' ? 'companies' : 'users';
    return `/env/${environmentId}/${list}?segment_id=${reference.id}`;
  }
  return `/project/${projectId}/settings/theme/${reference.id}`;
};
