/** A sync run is a full round over a mapping, or a journal poll's inbound changes. The keys are the wire strings. */
export const IntegrationSyncRunKind = {
  full: 'full',
  journal: 'journal',
} as const;

export type IntegrationSyncRunKind = keyof typeof IntegrationSyncRunKind;
