import { ContentDataType, ContentEditorElementType } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';

import {
  type TranslationSource,
  applyTranslationUnits,
  isContentTypeLocalizable,
  isEmbedUrlUnitPath,
  isMediaUrlUnitPath,
  readTranslationUnits,
  summarizeTranslationUnits,
} from './version-translation';

const textStep = (text: string, buttonText = 'Next'): ContentEditorRoot[] =>
  [
    {
      element: { type: ContentEditorElementType.GROUP },
      children: [
        {
          element: { type: ContentEditorElementType.COLUMN },
          children: [
            {
              element: {
                type: ContentEditorElementType.TEXT,
                data: [{ type: 'paragraph', children: [{ text }] }],
              },
              children: null,
            },
            {
              element: { type: ContentEditorElementType.BUTTON, data: { text: buttonText } },
              children: null,
            },
          ],
        },
      ],
    },
  ] as unknown as ContentEditorRoot[];

const flowSource = (steps: Record<string, ContentEditorRoot[]>): TranslationSource => ({
  contentType: ContentDataType.FLOW,
  steps: Object.entries(steps).map(([cvid, data]) => ({ cvid, data })),
  data: undefined,
});

const NO_EMBEDS = new Map();

describe('version translation units', () => {
  it('addresses flow units as steps/<cvid>/<unit path> and reports them untranslated', () => {
    const units = readTranslationUnits(flowSource({ 'step-a': textStep('Welcome') }), undefined);
    expect(units.map((unit) => unit.source)).toEqual(['Welcome', 'Next']);
    expect(units.every((unit) => unit.path.startsWith('steps/step-a/'))).toBe(true);
    expect(units.every((unit) => unit.translation === '' && !unit.outdated)).toBe(true);
    expect(summarizeTranslationUnits(units)).toEqual({ total: 2, missing: 2, outdated: 0 });
  });

  it('round-trips a write: applied translations read back, untouched units stay missing', () => {
    const source = flowSource({ 'step-a': textStep('Welcome') });
    const [textUnit] = readTranslationUnits(source, undefined);

    const stored = applyTranslationUnits(
      source,
      undefined,
      new Map([[textUnit.path, 'Bienvenue']]),
      NO_EMBEDS,
    );
    const units = readTranslationUnits(source, stored);
    expect(units.map((unit) => unit.translation)).toEqual(['Bienvenue', '']);
    expect(summarizeTranslationUnits(units)).toEqual({ total: 2, missing: 1, outdated: 0 });
  });

  it('merges onto the stored translation — a later partial write keeps earlier units', () => {
    const source = flowSource({ 'step-a': textStep('Welcome') });
    const [textUnit, buttonUnit] = readTranslationUnits(source, undefined);
    const first = applyTranslationUnits(
      source,
      undefined,
      new Map([[textUnit.path, 'Bienvenue']]),
      NO_EMBEDS,
    );
    const second = applyTranslationUnits(
      source,
      first,
      new Map([[buttonUnit.path, 'Suivant']]),
      NO_EMBEDS,
    );
    expect(readTranslationUnits(source, second).map((unit) => unit.translation)).toEqual([
      'Bienvenue',
      'Suivant',
    ]);
  });

  it('keeps the existing translation when a blank value is sent', () => {
    const source = flowSource({ 'step-a': textStep('Welcome') });
    const [textUnit] = readTranslationUnits(source, undefined);
    const first = applyTranslationUnits(
      source,
      undefined,
      new Map([[textUnit.path, 'Bienvenue']]),
      NO_EMBEDS,
    );
    const second = applyTranslationUnits(
      source,
      first,
      new Map([[textUnit.path, '  ']]),
      NO_EMBEDS,
    );
    expect(readTranslationUnits(source, second)[0].translation).toBe('Bienvenue');
  });

  it('flags a translated unit outdated once the source text changes, and a save clears it', () => {
    const original = flowSource({ 'step-a': textStep('Welcome') });
    const [textUnit] = readTranslationUnits(original, undefined);
    const stored = applyTranslationUnits(
      original,
      undefined,
      new Map([[textUnit.path, 'Bienvenue']]),
      NO_EMBEDS,
    );

    const edited = flowSource({ 'step-a': textStep('Welcome back') });
    const drifted = readTranslationUnits(edited, stored);
    expect(drifted[0]).toMatchObject({
      source: 'Welcome back',
      translation: 'Bienvenue',
      outdated: true,
    });
    // The untranslated button is "missing", never "outdated".
    expect(drifted[1].outdated).toBe(false);

    const resaved = applyTranslationUnits(
      edited,
      stored,
      new Map([[textUnit.path, 'Bon retour']]),
      NO_EMBEDS,
    );
    expect(readTranslationUnits(edited, resaved)[0]).toMatchObject({
      translation: 'Bon retour',
      outdated: false,
    });
  });

  it('keeps a removed step translation and its snapshot in the saved payload', () => {
    const both = flowSource({ 'step-a': textStep('Welcome'), 'step-b': textStep('Bye') });
    const units = readTranslationUnits(both, undefined);
    const stepBText = units.find((unit) => unit.path.startsWith('steps/step-b/'));
    const stored = applyTranslationUnits(
      both,
      undefined,
      new Map([[stepBText?.path ?? '', 'Au revoir']]),
      NO_EMBEDS,
    );

    const onlyA = flowSource({ 'step-a': textStep('Welcome') });
    const [stepAText] = readTranslationUnits(onlyA, stored);
    const resaved = applyTranslationUnits(
      onlyA,
      stored,
      new Map([[stepAText.path, 'Bienvenue']]),
      NO_EMBEDS,
    ) as { localized: Record<string, unknown>; backup: Record<string, unknown> };
    expect(Object.keys(resaved.localized).sort()).toEqual(['step-a', 'step-b']);
    expect(Object.keys(resaved.backup).sort()).toEqual(['step-a', 'step-b']);

    // The step revives with its translation intact.
    const revived = readTranslationUnits(both, resaved);
    expect(revived.find((unit) => unit.path === stepBText?.path)?.translation).toBe('Au revoir');
  });

  it('translates version data for non-flow types', () => {
    const source: TranslationSource = {
      contentType: ContentDataType.BANNER,
      steps: [],
      data: { contents: textStep('Maintenance tonight', 'Details') },
    };
    const units = readTranslationUnits(source, undefined);
    expect(units.map((unit) => unit.source)).toEqual(['Maintenance tonight', 'Details']);
    expect(units.some((unit) => unit.path.startsWith('steps/'))).toBe(false);

    const stored = applyTranslationUnits(
      source,
      undefined,
      new Map([[units[0].path, 'Maintenance ce soir']]),
      NO_EMBEDS,
    );
    expect(stored.backup).toEqual(source.data);
    expect(readTranslationUnits(source, stored)[0].translation).toBe('Maintenance ce soir');
  });

  it('classifies content types and media unit paths', () => {
    expect(isContentTypeLocalizable(ContentDataType.FLOW)).toBe(true);
    expect(isContentTypeLocalizable(ContentDataType.CHECKLIST)).toBe(true);
    expect(isContentTypeLocalizable(ContentDataType.TRACKER)).toBe(false);
    expect(isMediaUrlUnitPath('steps/x/0.0.0:image.url')).toBe(true);
    expect(isMediaUrlUnitPath('steps/x/0.0.0:image.link.url')).toBe(true);
    expect(isMediaUrlUnitPath('steps/x/0.0.0:text.0.0:link.url')).toBe(false);
    expect(isEmbedUrlUnitPath('steps/x/0.0.0:embed.url')).toBe(true);
    expect(isEmbedUrlUnitPath('steps/x/0.0.0:image.url')).toBe(false);
  });
});
