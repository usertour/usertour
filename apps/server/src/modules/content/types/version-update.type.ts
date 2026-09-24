import type { VersionDraft } from './version-draft.type';

/** A version save — what ContentService.updateContentVersion takes. */
export type VersionUpdate = {
  versionId: string;
  content: VersionDraft;
  /** Optimistic-lock baseline: the version's updatedAt the client last loaded. */
  expectedUpdatedAt?: Date;
};
