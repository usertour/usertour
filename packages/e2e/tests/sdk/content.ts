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

export const button = (text: string, actions: Action[] = []) => ({
  type: 'button',
  data: { text, type: 'primary', actions },
});

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
  /** Tooltip target: a CSS selector, or one with which match to take. */
  target?: string | { customSelector: string; sequence?: string };
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
});

export type FlowInput = {
  sessionId: string;
  contentId: string;
  versionId?: string;
  steps: StepInput[];
  /** Start on this step instead of the first. */
  currentCvid?: string;
  attributes?: unknown[];
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
      theme: { settings: defaultSettings },
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
) =>
  flowSession({
    sessionId,
    contentId,
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

// --- checklist ---

export type TaskInput = {
  id: string;
  name: string;
  isCompleted?: boolean;
  clickedActions?: Action[];
};

export const checklistSession = (input: {
  sessionId: string;
  contentId: string;
  tasks: TaskInput[];
  /** Open expanded (the server's `expandPending`). */
  expanded?: boolean;
  buttonText?: string;
  preventDismiss?: boolean;
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
      content: [row(paragraph('Get set up in three steps.'))],
      items: input.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        isCompleted: task.isCompleted ?? false,
        isVisible: true,
        clickedActions: task.clickedActions ?? [],
        completeConditions: [],
        onlyShowTask: false,
        onlyShowTaskConditions: [],
      })),
    },
  },
});

// --- banner ---

export const bannerSession = (input: { sessionId: string; contentId: string; text: string }) => ({
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
      embedPlacement: 'top-of-page',
      allowUsersToDismissEmbed: true,
      animateWhenEmbedAppears: false,
      contents: [row(paragraph(input.text))],
    },
  },
});

// --- launcher ---

export const launcherSession = (input: {
  sessionId: string;
  contentId: string;
  target: string;
  text: string;
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
      tooltip: { ...DEFAULT_LAUNCHER_DATA.tooltip, content: [row(paragraph(input.text))] },
      behavior: {
        ...DEFAULT_LAUNCHER_DATA.behavior,
        triggerElement: 'launcher',
        actionType: 'show-tooltip',
        triggerEvent: 'clicked',
        actions: [],
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
