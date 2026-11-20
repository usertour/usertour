import { createElement, type PropsWithChildren } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_EMBED_DATA, defaultSettings } from '@usertour/constants';
import { defaultStep } from '@usertour/helpers';
import type { Theme } from '@usertour/data';
import { StepContentType, type ContentVersion, type Step } from '@usertour/types';

import { useThemeList } from '@/hooks/use-theme-list';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import type { BuilderStoreState } from '@/pages/contents/components/builder/core/builder-store';
import { useEmbedEditor } from '@/pages/contents/components/builder/embed/use-embed-editor';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { EmbedOverviewCanvas } from '../embed-canvas';

jest.mock('@/hooks/use-theme-list', () => ({ useThemeList: jest.fn() }));
jest.mock('@/pages/contents/components/builder/core', () => ({ useBuilderStore: jest.fn() }));
jest.mock('@/pages/contents/components/builder/embed/use-embed-editor', () => ({
  useEmbedEditor: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// Keep the actual overview and theme hook. Replace the visual shell with a
// marker for its resolved theme, so this node suite needs no browser or app
// providers. Pixel-level widget behavior belongs to the Playwright suite.
jest.mock('@usertour/widget', () => {
  const { createElement, Fragment } = jest.requireActual<typeof import('react')>('react');
  const Container = ({ children }: PropsWithChildren) => createElement(Fragment, null, children);
  return {
    EmbedRoot: ({
      themeSettings,
      children,
    }: PropsWithChildren<{ themeSettings: Theme['settings'] }>) =>
      createElement(
        'section',
        { 'data-theme-background': themeSettings.embed?.backgroundColor.background },
        children,
      ),
    InlineContainer: Container,
    EmbedPreview: Container,
    ContentEditorSerialize: ({ contents }: { contents: Step['data'] }) =>
      createElement('div', null, JSON.stringify(contents)),
  };
});
jest.mock('@/pages/contents/components/builder/banner/components/browser-preview', () => ({
  BrowserPreview: ({ children }: PropsWithChildren) => children,
}));

// These imports serve the step editor in the same module, not the overview.
jest.mock('@/components/editor', () => ({}));
jest.mock('@/hooks/use-attribute-list', () => ({}));
jest.mock('@/hooks/use-upload', () => ({}));
jest.mock('@/pages/contents/components/builder/flow/use-flow-editor', () => ({}));
jest.mock('@/pages/contents/components/builder/hooks/use-content-list', () => ({}));
jest.mock('@/pages/contents/components/builder/hooks/use-oembed-info', () => ({}));

const makeTheme = (id: string, background: string, isDefault = false): Theme => ({
  id,
  name: id,
  projectId: 'project-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isDefault,
  isSystem: false,
  variations: [],
  settings: {
    ...defaultSettings,
    embed: {
      ...defaultSettings.embed,
      backgroundColor: { ...defaultSettings.embed.backgroundColor, background },
    },
  },
});

const versionTheme = makeTheme('version-theme', '#ffffff');
const stepTheme = makeTheme('step-theme', '#ff0000');
const otherStepTheme = makeTheme('other-step-theme', '#00ff00');
const defaultTheme = makeTheme('default-theme', '#0000ff', true);

const makeStep = (name: string, themeId: string | null = stepTheme.id): Step => ({
  ...defaultStep,
  id: name,
  name,
  type: StepContentType.INLINE,
  themeId,
  data: [
    {
      element: { type: 'group' },
      children: [
        {
          element: { type: 'column', width: { type: 'fill' } },
          children: [
            {
              element: { type: 'text', data: [{ type: 'paragraph', children: [{ text: name }] }] },
              children: null,
            },
          ],
        },
      ],
    },
  ],
});

let version: ContentVersion;
let currentStep: Step | null;

beforeEach(() => {
  version = {
    id: 'version-1',
    contentId: 'embed-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    themeId: versionTheme.id,
    config: null,
    data: DEFAULT_EMBED_DATA,
    sequence: 0,
    steps: [makeStep('First visible step')],
  };
  currentStep = null;
  jest
    .mocked(useBuilderStore)
    .mockImplementation((selector) =>
      selector({ currentVersion: version, currentStep } as BuilderStoreState),
    );
  jest.mocked(useThemeList).mockReturnValue({
    themeList: [versionTheme, stepTheme, otherStepTheme, defaultTheme],
  } as ReturnType<typeof useThemeList>);
  jest.mocked(useEmbedEditor).mockReturnValue({
    data: DEFAULT_EMBED_DATA,
  } as ReturnType<typeof useEmbedEditor>);
});

const expectOverviewTheme = (theme: Theme) => {
  const markup = renderToStaticMarkup(createElement(EmbedOverviewCanvas));
  expect(markup).toContain(
    `data-theme-background="${theme.settings.embed!.backgroundColor.background}"`,
  );
  return markup;
};

describe('the embed overview theme', () => {
  it('uses the displayed first step’s theme instead of the version theme', () => {
    expectOverviewTheme(stepTheme);
  });

  it('ignores the theme of another step left in the edit buffer', () => {
    currentStep = makeStep('Previously edited step', otherStepTheme.id);
    version.steps!.push(currentStep);
    const markup = expectOverviewTheme(stepTheme);
    expect(markup).toContain('First visible step');
    expect(markup).not.toContain('Previously edited step');
  });

  it('skips hidden steps for both the displayed content and its theme', () => {
    const hidden = { ...makeStep('Hidden step', otherStepTheme.id), type: StepContentType.HIDDEN };
    version.steps!.unshift(hidden);
    currentStep = hidden;
    const markup = expectOverviewTheme(stepTheme);
    expect(markup).toContain('First visible step');
    expect(markup).not.toContain('Hidden step');
  });

  it('inherits the version theme when the displayed step has no override', () => {
    version.steps = [makeStep('First visible step', null)];
    currentStep = makeStep('Previously edited step', otherStepTheme.id);
    expectOverviewTheme(versionTheme);
  });

  it('inherits the project default when neither the displayed step nor version has a theme', () => {
    version.steps = [makeStep('First visible step', null)];
    version.themeId = null;
    currentStep = makeStep('Previously edited step', otherStepTheme.id);
    expectOverviewTheme(defaultTheme);
  });

  it.each(['empty', 'all hidden'] as const)(
    'uses the version theme for %s steps, ignoring the edit buffer',
    (scenario) => {
      currentStep = makeStep('Previously edited step', otherStepTheme.id);
      version.steps =
        scenario === 'empty' ? [] : [{ ...currentStep, type: StepContentType.HIDDEN }];
      const markup = expectOverviewTheme(versionTheme);
      expect(markup).not.toContain('Previously edited step');
    },
  );

  it('uses the project default for an empty version without a theme', () => {
    version.steps = [];
    version.themeId = null;
    currentStep = makeStep('Previously edited step', otherStepTheme.id);
    expectOverviewTheme(defaultTheme);
  });
});

// Other builder views omit the step option: keep their existing selection
// order when adding the overview's explicit-step behavior.
const CurrentThemeProbe = ({ fallbackToDefault = true }: { fallbackToDefault?: boolean }) => {
  const theme = useCurrentTheme({ fallbackToDefault });
  return createElement('output', null, theme?.id ?? 'no-theme');
};

describe('theme selection without an explicit step', () => {
  it('continues to use the current edited step', () => {
    currentStep = makeStep('Currently edited step', otherStepTheme.id);
    expect(renderToStaticMarkup(createElement(CurrentThemeProbe))).toContain(otherStepTheme.id);
  });

  it('inherits the version theme when the current step has no override', () => {
    currentStep = makeStep('Currently edited step', null);
    expect(renderToStaticMarkup(createElement(CurrentThemeProbe))).toContain(versionTheme.id);
  });

  it('inherits the project default when there is no current step or version theme', () => {
    version.themeId = null;
    expect(renderToStaticMarkup(createElement(CurrentThemeProbe))).toContain(defaultTheme.id);
  });

  it('does not use the default theme when fallback is disabled', () => {
    version.themeId = null;
    expect(
      renderToStaticMarkup(createElement(CurrentThemeProbe, { fallbackToDefault: false })),
    ).toContain('no-theme');
  });
});
