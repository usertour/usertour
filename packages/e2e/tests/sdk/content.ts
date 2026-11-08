import {
  DEFAULT_BANNER_DATA,
  DEFAULT_CHECKLIST_DATA,
  DEFAULT_LAUNCHER_DATA,
  DEFAULT_RESOURCE_CENTER_DATA,
  defaultSettings,
} from '@usertour/constants';

/**
 * The sessions the server pushes to the SDK, reduced to what the widgets
 * read. The shapes follow the server's session builder
 * (apps/server/src/modules/delivery/services/session-builder.service.ts):
 * a version's data lands under `version.steps`, `version.checklist`,
 * `version.banner`, `version.launcher` or `version.resourceCenter`, and the
 * theme is resolved into `version.theme.settings`.
 */

export const PROJECT = { id: 'project-1', removeBranding: false };

let seq = 0;
const id = (label: string) => `${label}-${seq++}`;

// --- content blocks (the group → column → element shape the editor saves) ---

export const row = (...elements: unknown[]) => ({
  element: { type: 'group' },
  children: [
    {
      element: { type: 'column', width: { type: 'fill' }, justifyContent: 'justify-center' },
      children: elements.map((element) => ({ element, children: null })),
    },
  ],
});

export const paragraph = (text: string) => ({
  type: 'text',
  data: [{ type: 'paragraph', children: [{ text }] }],
});

export type Action = { id: string; type: string; data: Record<string, unknown> };
export const gotoStep = (stepCvid: string): Action => ({
  id: id('action'),
  type: 'step-goto',
  data: { stepCvid },
});
export const dismissFlow = (): Action => ({ id: id('action'), type: 'flow-dismis', data: {} });
export const dismissChecklist = (): Action => ({
  id: id('action'),
  type: 'checklist-dismis',
  data: {},
});
export const dismissLauncher = (): Action => ({
  id: id('action'),
  type: 'launcher-dismis',
  data: {},
});
export const dismissBanner = (): Action => ({ id: id('action'), type: 'banner-dismis', data: {} });

export const button = (
  text: string,
  actions: Action[] = [],
  rules: { disableWhen?: unknown[]; hideWhen?: unknown[] } = {},
) => ({
  type: 'button',
  data: {
    text,
    type: 'primary',
    actions,
    ...(rules.disableWhen
      ? { disableButton: true, disableButtonConditions: rules.disableWhen }
      : {}),
    ...(rules.hideWhen ? { hideButton: true, hideButtonConditions: rules.hideWhen } : {}),
  },
});

// --- conditions evaluated in the page ---

export const elementPresent = (selector: string) => ({
  id: `present:${selector}`,
  type: 'element',
  operators: 'and',
  data: {
    logic: 'present',
    elementData: { type: 'manual', customSelector: selector, sequence: '1st' },
  },
});

export const inputEmpty = (selector: string) => ({
  id: `empty:${selector}`,
  type: 'text-input',
  operators: 'and',
  data: {
    logic: 'empty',
    elementData: { type: 'manual', customSelector: selector, sequence: '1st' },
  },
});

/** Open `url` in this tab (`same`) or in a new one (`new`). */
export const navigate = (url: string, openType: 'same' | 'new' = 'same'): Action => ({
  id: id('action'),
  type: 'page-navigate',
  data: { value: [{ type: 'paragraph', children: [{ text: url }] }], openType },
});

/** Start another flow, at a step when given. */
export const startFlow = (contentId: string, stepCvid?: string): Action => ({
  id: id('action'),
  type: 'flow-start',
  data: { contentId, ...(stepCvid ? { stepCvid } : {}) },
});

/** Run `code` in the page. */
export const evaluateJs = (code: string): Action => ({
  id: id('action'),
  type: 'javascript-evaluate',
  data: { value: code },
});

/** A text block whose paragraph mixes plain text (`{ text }`) and links. */
export const richText = (...children: unknown[]) => ({
  type: 'text',
  data: [{ type: 'paragraph', children }],
});

export const link = (text: string, url: string) => ({ type: 'link', url, children: [{ text }] });

/** A user attribute's value in text, `fallback` when the user has none. */
export const userAttribute = (attrCode: string, fallback = '') => ({
  type: 'user-attribute',
  attrCode,
  fallback,
  children: [{ text: '' }],
});

// --- questions (the shapes the builder seeds, filled in as an author would) ---

export type QuestionKind = 'nps' | 'star' | 'scale' | 'single' | 'multi' | 'text' | 'textarea';

const choiceOptions = () => [
  { label: 'Daily', value: 'daily', checked: false },
  { label: 'Weekly', value: 'weekly', checked: false },
  { label: 'Monthly', value: 'monthly', checked: false },
];

/** A question block of `kind`; `extra` adds actions or an attribute binding to its data. */
export const question = (kind: QuestionKind, extra: Record<string, unknown> = {}) => {
  const cvid = `q-${kind}`;
  switch (kind) {
    case 'nps':
      return {
        type: 'nps',
        data: {
          cvid,
          name: 'How likely are you to recommend us?',
          lowLabel: '',
          highLabel: '',
          ...extra,
        },
      };
    case 'star':
      return {
        type: 'star-rating',
        data: { cvid, name: 'Rate this feature', lowRange: 1, highRange: 5, ...extra },
      };
    case 'scale':
      return {
        type: 'scale',
        data: { cvid, name: 'How easy was setup?', lowRange: 1, highRange: 5, ...extra },
      };
    case 'single':
    case 'multi':
      return {
        type: 'multiple-choice',
        data: {
          cvid,
          name: kind === 'single' ? 'How often do you report?' : 'Which reports do you use?',
          options: choiceOptions(),
          shuffleOptions: false,
          enableOther: false,
          allowMultiple: kind === 'multi',
          ...extra,
        },
      };
    case 'text':
    case 'textarea':
      return {
        type: kind === 'text' ? 'single-line-text' : 'multi-line-text',
        data: {
          cvid,
          name: kind === 'text' ? 'Your role' : 'Anything else?',
          placeholder: '',
          buttonText: '',
          required: false,
          ...extra,
        },
      };
  }
};

// --- flow ---

const stepSetting = {
  skippable: true,
  enabledBackdrop: false,
  enabledBlockTarget: false,
  height: 0,
  position: 'center',
  positionOffsetX: 0,
  positionOffsetY: 0,
  alignType: 'fixed',
  side: 'bottom',
  align: 'center',
  sideOffset: 0,
  alignOffset: 0,
};

export type StepInput = {
  id: string;
  cvid: string;
  type: 'modal' | 'tooltip' | 'bubble' | 'hidden';
  name?: string;
  data: unknown[];
  /**
   * Tooltip target: a CSS selector, or one with which match to take, the text
   * the element must have (`content`) and actions to run when it is clicked.
   */
  target?:
    | string
    | { customSelector: string; sequence?: string; content?: string; actions?: Action[] };
  /** The step's own theme, over the version's. */
  theme?: unknown;
  setting?: Partial<typeof stepSetting>;
  trigger?: unknown[];
};

export const step = (input: StepInput, sequence: number) => ({
  id: input.id,
  cvid: input.cvid,
  name: input.name ?? input.id,
  type: input.type,
  sequence,
  setting: { ...stepSetting, ...(input.setting ?? {}) },
  data: input.data,
  ...(input.target
    ? {
        target: {
          type: 'manual',
          ...(typeof input.target === 'string' ? { customSelector: input.target } : input.target),
        },
      }
    : {}),
  ...(input.trigger ? { trigger: input.trigger } : {}),
  ...(input.theme ? { theme: input.theme } : {}),
});

export type FlowInput = {
  sessionId: string;
  contentId: string;
  versionId?: string;
  steps: StepInput[];
  /** Start on this step instead of the first. */
  currentCvid?: string;
  attributes?: unknown[];
  /** The version's theme settings; the default theme when left out. */
  themeSettings?: unknown;
  /** The whole version theme (settings, variations), instead of `themeSettings`; null for none. */
  theme?: unknown;
};

export const flowSession = (input: FlowInput) => {
  const steps = input.steps.map((item, index) => step(item, index));
  const current = input.currentCvid
    ? steps.find((item) => item.cvid === input.currentCvid)
    : undefined;
  return {
    id: input.sessionId,
    type: 'flow',
    draftMode: false,
    attributes: input.attributes ?? [],
    content: { id: input.contentId, name: input.contentId, type: 'flow', project: PROJECT },
    version: {
      id: input.versionId ?? `${input.contentId}-version`,
      theme:
        input.theme !== undefined
          ? input.theme
          : { settings: input.themeSettings ?? defaultSettings },
      steps,
    },
    ...(current ? { currentStep: { id: current.id, cvid: current.cvid } } : {}),
  };
};

/** Two steps: a modal with a Next button, then a tooltip on `target` with a Done button. */
export const twoStepFlow = (
  sessionId: string,
  contentId: string,
  target: StepInput['target'] = '#cta',
  themeSettings?: unknown,
) =>
  flowSession({
    sessionId,
    contentId,
    themeSettings,
    steps: [
      {
        id: `${contentId}-step-1`,
        cvid: `${contentId}-cvid-1`,
        type: 'modal',
        name: 'Welcome',
        data: [
          row(paragraph('Welcome aboard')),
          row(button('Next', [gotoStep(`${contentId}-cvid-2`)])),
        ],
      },
      {
        id: `${contentId}-step-2`,
        cvid: `${contentId}-cvid-2`,
        type: 'tooltip',
        name: 'Call to action',
        target,
        data: [row(paragraph('Click here to begin')), row(button('Done', [dismissFlow()]))],
      },
    ],
  });

/** A flow of one modal step made of `rows`. */
export const modalFlow = (sessionId: string, contentId: string, rows: unknown[]) =>
  flowSession({
    sessionId,
    contentId,
    steps: [
      {
        id: `${contentId}-step-1`,
        cvid: `${contentId}-cvid-1`,
        type: 'modal',
        name: 'Only step',
        data: rows,
      },
    ],
  });

// --- checklist ---

export type TaskInput = {
  id: string;
  name: string;
  isCompleted?: boolean;
  /** False for a task whose show-only-when rules do not hold for this user. */
  isVisible?: boolean;
  clickedActions?: Action[];
  completeConditions?: unknown[];
};

export const checklistSession = (input: {
  sessionId: string;
  contentId: string;
  tasks: TaskInput[];
  /** Open expanded (the server's `expandPending`). */
  expanded?: boolean;
  buttonText?: string;
  preventDismiss?: boolean;
  autoDismiss?: boolean;
  completionOrder?: 'any' | 'ordered';
  /** The blocks above the tasks. */
  content?: unknown[];
}) => ({
  id: input.sessionId,
  type: 'checklist',
  draftMode: false,
  attributes: [],
  expandPending: input.expanded ?? true,
  content: { id: input.contentId, name: input.contentId, type: 'checklist', project: PROJECT },
  version: {
    id: `${input.contentId}-version`,
    theme: { settings: defaultSettings },
    checklist: {
      ...DEFAULT_CHECKLIST_DATA,
      buttonText: input.buttonText ?? 'Get started',
      preventDismissChecklist: input.preventDismiss ?? false,
      autoDismissChecklist: input.autoDismiss ?? false,
      completionOrder: input.completionOrder ?? 'any',
      content: input.content ?? [row(paragraph('Get set up in three steps.'))],
      items: input.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        isCompleted: task.isCompleted ?? false,
        isVisible: task.isVisible ?? true,
        clickedActions: task.clickedActions ?? [],
        completeConditions: task.completeConditions ?? [],
        onlyShowTask: false,
        onlyShowTaskConditions: [],
      })),
    },
  },
});

// --- banner ---

export type BannerPlacement =
  | 'top-of-page'
  | 'bottom-of-page'
  | 'top-of-container-element'
  | 'bottom-of-container-element'
  | 'immediately-before-element'
  | 'immediately-after-element';

export const bannerSession = (input: {
  sessionId: string;
  contentId: string;
  text: string;
  /** The element a container placement attaches to. Alone, it embeds at its top. */
  container?: string;
  placement?: BannerPlacement;
  allowDismiss?: boolean;
  /** Blocks after the text. */
  blocks?: unknown[];
}) => ({
  id: input.sessionId,
  type: 'banner',
  draftMode: false,
  attributes: [],
  content: { id: input.contentId, name: input.contentId, type: 'banner', project: PROJECT },
  version: {
    id: `${input.contentId}-version`,
    theme: { settings: defaultSettings },
    banner: {
      ...DEFAULT_BANNER_DATA,
      embedPlacement:
        input.placement ?? (input.container ? 'top-of-container-element' : 'top-of-page'),
      ...(input.container
        ? { containerElement: { type: 'manual', customSelector: input.container } }
        : {}),
      allowUsersToDismissEmbed: input.allowDismiss ?? true,
      animateWhenEmbedAppears: false,
      contents: [row(paragraph(input.text)), ...(input.blocks ?? [])],
    },
  },
});

// --- launcher ---

export const launcherSession = (input: {
  /** Empty for a launcher the server offers before it has a session. */
  sessionId: string;
  contentId: string;
  target: string;
  text: string;
  /** Blocks after the tooltip's text. */
  blocks?: unknown[];
  triggerElement?: 'launcher' | 'target' | 'target-or-launcher';
  /** `perform-action` runs `actions` instead of opening the tooltip. */
  actions?: Action[];
  dismissAfterFirstActivation?: boolean;
}) => ({
  id: input.sessionId,
  type: 'launcher',
  draftMode: false,
  attributes: [],
  content: { id: input.contentId, name: input.contentId, type: 'launcher', project: PROJECT },
  version: {
    id: `${input.contentId}-version`,
    theme: { settings: defaultSettings },
    launcher: {
      ...DEFAULT_LAUNCHER_DATA,
      target: {
        ...DEFAULT_LAUNCHER_DATA.target,
        element: { type: 'manual', customSelector: input.target },
      },
      tooltip: {
        ...DEFAULT_LAUNCHER_DATA.tooltip,
        content: [row(paragraph(input.text)), ...(input.blocks ?? [])],
        settings: {
          ...DEFAULT_LAUNCHER_DATA.tooltip.settings,
          dismissAfterFirstActivation: input.dismissAfterFirstActivation ?? false,
        },
      },
      behavior: {
        ...DEFAULT_LAUNCHER_DATA.behavior,
        triggerElement: input.triggerElement ?? 'launcher',
        actionType: input.actions ? 'perform-action' : 'show-tooltip',
        triggerEvent: 'clicked',
        actions: input.actions ?? [],
      },
    },
  },
});

// --- resource center ---

export const resourceCenterSession = (input: {
  sessionId: string;
  contentId: string;
  buttonText?: string;
  actions: Array<{ id: string; name: string }>;
}) => ({
  id: input.sessionId,
  type: 'resource-center',
  draftMode: false,
  attributes: [],
  content: {
    id: input.contentId,
    name: input.contentId,
    type: 'resource-center',
    project: PROJECT,
  },
  version: {
    id: `${input.contentId}-version`,
    theme: { settings: defaultSettings },
    resourceCenter: {
      ...DEFAULT_RESOURCE_CENTER_DATA,
      buttonText: input.buttonText ?? 'Help',
      headerText: 'Resource Center',
      tabs: [
        {
          id: `${input.contentId}-tab-home`,
          name: 'Home',
          iconSource: 'builtin',
          iconType: 'home-line',
          blocks: [
            {
              id: `${input.contentId}-intro`,
              type: 'richtext',
              content: [row(paragraph('How can we help?'))],
              onlyShowBlock: false,
              onlyShowBlockConditions: [],
            },
            ...input.actions.map((action) => ({
              id: action.id,
              type: 'action',
              name: [{ type: 'paragraph', children: [{ text: action.name }] }],
              iconSource: 'builtin',
              iconType: 'book-open-fill',
              clickedActions: [],
              onlyShowBlock: false,
              onlyShowBlockConditions: [],
            })),
          ],
        },
      ],
    },
  },
});
