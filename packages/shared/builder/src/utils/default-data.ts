import {
  ContentEditorRoot,
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  LauncherIconSource,
  LauncherPositionType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
} from '@usertour/types';

export const defaultLauncherData: LauncherData = {
  type: LauncherDataType.ICON,
  iconType: 'user',
  iconSource: LauncherIconSource.BUILTIN,
  target: {
    element: undefined,
    screenshot: undefined,
    alignment: {
      side: 'top',
      align: 'center',
      alignType: 'auto',
      sideOffset: 0,
      alignOffset: 0,
    },
  },
  tooltip: {
    reference: LauncherPositionType.TARGET,
    element: undefined,
    alignment: {
      side: 'top',
      align: 'center',
      alignType: 'auto',
      sideOffset: 0,
      alignOffset: 0,
    },
    content: [],
    width: 250,
    settings: {
      dismissAfterFirstActivation: false,
      keepTooltipOpenWhenHovered: false,
      hideLauncherWhenTooltipIsDisplayed: false,
    },
  },
  behavior: {
    triggerElement: LauncherTriggerElement.LAUNCHER,
    actionType: LauncherActionType.SHOW_TOOLTIP,
    triggerEvent: LauncherTriggerEvent.CLICKED,
    actions: [],
  },
};

const defaultTooltipContent = [
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          justifyContent: 'justify-start',
          width: {
            type: 'fill',
          },
          style: {},
        },
        children: [
          {
            element: {
              type: 'text',
              data: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: 'Write text here',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: '',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

const defaultHiddenContent = [
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          justifyContent: 'justify-center',
          width: {
            type: 'fill',
          },
          style: {},
        },
        children: [
          {
            element: {
              type: 'text',
              data: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: 'Write text here',
                    },
                  ],
                  align: 'left',
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: '',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-end',
          style: {},
        },
        children: [
          {
            element: {
              type: 'button',
              data: {
                action: 'goto',
                text: 'Prev',
                type: 'secondary',
              },
            },
            children: null,
          },
          {
            element: {
              type: 'button',
              data: {
                action: 'goto',
                text: 'Next',
                type: 'default',
              },
              margin: {
                top: 0,
                left: '10',
                bottom: 0,
                right: 0,
                enabled: true,
              },
            },
            children: null,
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

const defaultModalContent = [
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-center',
        },
        children: [
          {
            element: {
              url: 'https://assets.usertour.io/5d9975de-f095-40ee-a6f9-8da3c3c38515/stick-figures-holding-word-welcome-vector-banner-text-welcome-welcome-together-people-big-colorful-letters-114865217.webp',
              type: 'image',
            },
            children: null,
          },
        ],
      },
    ],
  },
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-start',
        },
        children: [
          {
            element: {
              data: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: '',
                    },
                  ],
                },
                {
                  type: 'h1',
                  align: 'center',
                  children: [
                    {
                      bold: true,
                      text: 'Welcome to Usertour!',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  align: 'center',
                  children: [
                    {
                      text: '',
                    },
                  ],
                },
              ],
              type: 'text',
            },
            children: null,
          },
        ],
      },
    ],
  },
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-center',
        },
        children: [
          {
            element: {
              data: {
                text: "Let's create a flow",
                type: 'default',
                action: 'goto',
                actions: [
                  {
                    data: {
                      stepCvid: '',
                    },
                    type: 'step-goto',
                    operators: 'and',
                  },
                ],
              },
              type: 'button',
            },
            children: null,
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

// Create base step data based on type
export const getDefaultDataForType = (type: string) => {
  switch (type) {
    case 'modal':
      return defaultModalContent; // Use defaultModalContent for modal (has image and buttons)
    case 'hidden':
      return defaultHiddenContent; // Use defaultHiddenContent for hidden (has buttons)
    case 'bubble':
      return defaultTooltipContent; // Use defaultTooltipContent for bubble (simple text like tooltip)
    default:
      return defaultTooltipContent; // Use defaultTooltipContent for tooltip (simple text)
  }
};
