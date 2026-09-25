/**
 * Where a referrer uses a definition — structured so each surface words it
 * itself (the web app per locale, MCP in English).
 */
export interface ReferenceLocation {
  surface:
    | 'startRules'
    | 'hideRules'
    | 'versionSettings'
    | 'contentBody'
    | 'stepTrigger'
    | 'stepContent'
    | 'questionBinding'
    | 'versionTheme'
    | 'stepTheme'
    | 'segmentConditions'
    | 'themeVariations';
  /** 1-based step number, on the step surfaces. */
  step?: number;
  /** Which of the content's live versions holds it, for a content referrer. */
  version?: 'draft' | 'published' | 'draftAndPublished';
}
