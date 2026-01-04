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
          justifyContent: 'justify-center',
          width: {
            type: 'fill',
          },
          style: {},
        },
        children: [
          {
            element: {
              type: 'image',
              url: 'https://assets.usertour.io/5d9975de-f095-40ee-a6f9-8da3c3c38515/stick-figures-holding-word-welcome-vector-banner-text-welcome-welcome-together-people-big-colorful-letters-114865217.webp',
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
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-start',
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
                      text: '',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      text: 'Title',
                    },
                  ],
                },
              ],
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
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-start',
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
              ],
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
          justifyContent: 'justify-end',
          width: {
            type: 'fill',
          },
          style: {},
        },
        children: [
          {
            element: {
              type: 'button',
              data: {
                text: 'Prev',
                type: 'secondary',
                action: 'next',
              },
            },
            children: null,
          },
          {
            element: {
              type: 'button',
              data: {
                text: 'Next',
                type: '',
                action: 'next',
              },
              margin: {
                top: '0',
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

/**
 * Preview content for NPS survey theme preview
 */
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
                      text: 'How easy-to-use is our product?',
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
                cvid: 'oatboqldqf7qcxtl1kdrvsvk',
                name: 'sss',
                actions: [
                  {
                    data: {},
                    type: 'flow-dismis',
                    operators: 'and',
                  },
                ],
                lowLabel: '',
                highLabel: '',
                bindToAttribute: true,
                selectedAttribute: 'nn5',
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
