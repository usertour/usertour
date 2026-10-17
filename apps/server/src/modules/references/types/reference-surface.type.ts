import type { ReferenceLocation } from './reference-location.type';

/** The surfaces a reference can sit on, as a GraphQL enum object typed by the location's union. */
export const ReferenceSurface: { [Value in ReferenceLocation['surface']]: Value } = {
  startRules: 'startRules',
  hideRules: 'hideRules',
  versionSettings: 'versionSettings',
  contentBody: 'contentBody',
  stepTrigger: 'stepTrigger',
  stepContent: 'stepContent',
  questionBinding: 'questionBinding',
  versionTheme: 'versionTheme',
  stepTheme: 'stepTheme',
  segmentConditions: 'segmentConditions',
  themeVariations: 'themeVariations',
};
