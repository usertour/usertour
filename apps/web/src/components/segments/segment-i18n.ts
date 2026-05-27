import type { SegmentEntity } from './types';

/**
 * Resolves the i18n namespace prefix for a given segment entity. The
 * users and companies key trees are intentionally kept separate (English
 * copy differs — "New user segment" vs "New company segment"); this
 * helper centralises the entity→namespace lookup so the shared dialogs
 * never have a `users.*` or `companies.*` literal scattered across
 * their bodies.
 */
export const segmentNamespace = (entity: SegmentEntity): 'users' | 'companies' =>
  entity === 'user' ? 'users' : 'companies';

/**
 * Capitalised entity-subject used inside composite key names like
 * `users.dialogs.deleteUsers.*` or `companies.dialogs.removeCompaniesFromSegment.*`.
 */
export const segmentSubject = (entity: SegmentEntity): 'Users' | 'Companies' =>
  entity === 'user' ? 'Users' : 'Companies';
