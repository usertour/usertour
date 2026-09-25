import type { ReferenceLocation } from '../types/reference-location.type';

const VERSION_LABELS: Record<NonNullable<ReferenceLocation['version']>, string> = {
  draft: 'draft',
  published: 'published',
  draftAndPublished: 'draft+published',
};

/**
 * The English phrase MCP `list_references` has always returned for a
 * location — e.g. "start rules (draft)", "step 2 trigger (published)".
 */
export const describeReferenceLocation = (location: ReferenceLocation): string => {
  const step = `step ${location.step ?? 1}`;
  const phrase = {
    startRules: 'start rules',
    hideRules: 'hide rules',
    versionSettings: 'version settings',
    contentBody: 'content body',
    stepTrigger: `${step} trigger`,
    stepContent: `${step} content`,
    questionBinding: `${step} question binding`,
    versionTheme: 'version theme',
    stepTheme: `${step} theme override`,
    segmentConditions: 'segment conditions',
    themeVariations: 'theme variation conditions',
  }[location.surface];
  return location.version ? `${phrase} (${VERSION_LABELS[location.version]})` : phrase;
};
