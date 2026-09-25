/** A definition kind the reverse-reference lookup targets (ADR 0016). */
export type DefinitionReferenceKind = 'attribute' | 'event' | 'segment' | 'theme';

/** Where a referrer uses the definition. */
export interface DefinitionReferenceLocation {
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
  step: number | null;
  /** Which of a content's live versions holds it. */
  version: 'draft' | 'published' | 'draftAndPublished' | null;
}

/** Something that still uses a definition — a content, a segment or a theme. */
export interface DefinitionReference {
  referrerKind: 'content' | 'segment' | 'theme';
  id: string;
  name: string;
  contentType: string | null;
  segmentBizType: 'user' | 'company' | null;
  locations: DefinitionReferenceLocation[];
}
