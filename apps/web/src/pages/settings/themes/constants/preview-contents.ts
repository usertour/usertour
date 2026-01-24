import type { ContentEditorRoot } from '@usertour/types';

/**
 * Preview content for theme list card
 */
export const LIST_PREVIEW_CONTENT = [
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
                      text: 'Welcome to Usertour!',
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
                left: 10,
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

/**
 * Preview content for tooltip theme preview
 */
export const TOOLTIP_PREVIEW_CONTENT = [
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
                      text: 'Tooltips attach to their specific target elements.',
                    },
                  ],
                  align: 'left',
                },
              ],
            },
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

/**
 * Preview content for modal theme preview
 */
export const MODAL_PREVIEW_CONTENT = [
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
                  type: 'h1',
                  align: 'left',
                  children: [
                    {
                      text: 'Header1',
                    },
                  ],
                },
                {
                  type: 'h1',
                  align: 'left',
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
              data: [
                {
                  type: 'h2',
                  children: [
                    {
                      text: 'Header 2',
                    },
                  ],
                },
                {
                  type: 'h2',
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
              data: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: 'Welcome to the modal preview! Unlike tooltips, modals appear in the center of the screen with a dimmed overlay, providing a focused experience for important messages.',
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
                {
                  type: 'paragraph',
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
                text: 'Primary',
                type: 'default',
                action: 'goto',
                actions: [
                  {
                    id: 'sczxx6ebvt6e40ct8uvlsjnq',
                    data: {},
                    type: 'flow-dismis',
                    operators: 'and',
                  },
                ],
              },
              type: 'button',
              margin: {
                top: 0,
                left: 0,
                right: '8',
                bottom: 0,
                enabled: true,
              },
            },
            children: null,
          },
          {
            element: {
              data: {
                text: 'Secondary',
                type: 'secondary',
                action: 'goto',
                actions: [
                  {
                    id: 'w3jymweencwafs6bqgp78tqu',
                    data: {
                      stepCvid: 'cmjzmjqmn00emxhxnoie4h6fw',
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

/**
 * Preview content for NPS survey theme preview
 */
/**
 * Preview content for bubble theme preview
 */
export const BUBBLE_PREVIEW_CONTENT = [
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
                      text: 'Hi there! 👋 Need help getting started? I can guide you through the key features.',
                    },
                  ],
                  align: 'left',
                },
              ],
            },
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

export const NPS_PREVIEW_CONTENT = [
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
                  align: 'center',
                  children: [
                    {
                      text: 'How likely are you to recommend us to a friend?',
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
                cvid: 'riwt4wrn1xqhdsv1edzd6sej',
                name: 'Nps',
                actions: [],
                lowLabel: '',
                highLabel: '',
              },
              type: 'nps',
            },
            children: null,
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];
