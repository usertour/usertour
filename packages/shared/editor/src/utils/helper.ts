import { uuidV4 } from '@usertour-packages/utils';
import {
  ContentEditorClickableElement,
  ContentEditorElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
} from '../types/editor';
import { isEmptyString } from '@usertour-packages/utils';
import { Step } from '@usertour/types';
import { cuid } from '@usertour-packages/utils';

export const EmptyGroup = {
  element: { type: 'group' },
  children: [],
} as ContentEditorRoot;

export const EmptyColumn = {
  element: {
    type: 'column',
    width: { type: 'fill' },
    justifyContent: 'justify-center',
    style: {},
  },
  children: [],
} as ContentEditorRootColumn;

export const EmptyButton = {
  element: {
    type: 'button',
    data: {
      action: 'next',
      text: 'Next',
      type: 'default',
    },
  },
} as ContentEditorRootElement;

export const EmptyImage = {
  element: { type: 'image', url: '' },
} as ContentEditorRootElement;

export const EmptyEmbed = {
  element: { type: 'embed', url: '' },
} as ContentEditorRootElement;

export const EmptyText = {
  element: {
    type: 'text',
    data: [{ type: 'paragraph', children: [{ text: 'Write text here' }] }],
  },
} as ContentEditorRootElement;

export const createNewGroup = (children: ContentEditorRootElement[]) => {
  return {
    ...EmptyGroup,
    id: uuidV4(),
    children: [
      {
        ...EmptyColumn,
        id: uuidV4(),
        children: [...children],
      },
    ],
  };
};

export const createNewColumn = (children: ContentEditorRootElement[]) => {
  return {
    ...EmptyColumn,
    id: uuidV4(),
    children: [...children],
  };
};

export const defaultInitialValue = [
  {
    ...EmptyGroup,
    children: [
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyText,
          },
        ],
      },
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyEmbed,
          },
        ],
      },
    ],
  },
  {
    ...EmptyGroup,
    children: [
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyButton,
          },
        ],
      },
      {
        ...EmptyColumn,
        children: [
          {
            ...EmptyImage,
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

export const groupData = [
  {
    type: 'group',
    isFirst: true,
    isLast: true,
    children: [
      {
        type: 'column',
        width: { type: 'fill', value: 50 },

        justifyContent: 'justify-center',
        style: { marginRight: '30' },
        children: [
          {
            type: 'paragraph',
            children: [{ text: 'Write text here' }],
          },
        ],
      },
      {
        type: 'column',
        width: { type: 'fill', value: 50 },
        justifyContent: 'justify-center',
        style: { marginRight: '30' },
        children: [
          {
            type: 'paragraph',
            children: [{ text: 'Write text here' }],
          },
        ],
      },
    ],
  },
];

export const createValue1 = [
  // {
  //   element: {
  //     type: "group",
  //   },
  //   children: [
  //     {
  //       element: {
  //         type: "column",
  //         width: {
  //           type: "fill",
  //         },
  //         justifyContent: "justify-start",
  //         style: {},
  //       },
  //       children: [
  //         {
  //           element: {
  //             type: "text",
  //             data: [
  //               {
  //                 type: "h1",
  //                 children: [
  //                   {
  //                     text: "This is Title",
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //           children: null,
  //         },
  //       ],
  //     },
  //   ],
  // },
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
];

export const createValue2 = [
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
];
export const createValue3 = [
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
];
// export const createValue3 = [

//   {
//     element: {
//       type: "group",
//     },
//     children: [
//       {
//         element: {
//           type: "column",
//           justifyContent: "justify-center",
//           width: {
//             type: "fill",
//           },
//           style: {},
//         },
//         children: [
//           {
//             element: {
//               type: "image",
//               url: "https://assets.usertour.io/5d9975de-f095-40ee-a6f9-8da3c3c38515/stick-figures-holding-word-welcome-vector-banner-text-welcome-welcome-together-people-big-colorful-letters-114865217.webp",
//             },
//             children: null,
//           },
//         ],
//       },
//     ],
//   },
//   {
//     element: {
//       type: "group",
//     },
//     children: [
//       {
//         element: {
//           type: "column",
//           width: {
//             type: "fill",
//           },
//           justifyContent: "justify-start",
//           style: {},
//         },
//         children: [
//           {
//             element: {
//               type: "text",
//               data: [
//                 {
//                   type: "paragraph",
//                   children: [
//                     {
//                       text: "",
//                     },
//                   ],
//                 },
//                 {
//                   type: "paragraph",
//                   children: [
//                     {
//                       text: "Title",
//                     },
//                   ],
//                 },
//               ],
//             },
//             children: null,
//           },
//         ],
//       },
//     ],
//   },
//   {
//     element: {
//       type: "group",
//     },
//     children: [
//       {
//         element: {
//           type: "column",
//           width: {
//             type: "fill",
//           },
//           justifyContent: "justify-start",
//           style: {},
//         },
//         children: [
//           {
//             element: {
//               type: "text",
//               data: [
//                 {
//                   type: "paragraph",
//                   children: [
//                     {
//                       text: "Enter text here",
//                     },
//                   ],
//                 },
//               ],
//             },
//             children: null,
//           },
//         ],
//       },
//     ],
//   },
//   {
//     element: {
//       type: "group",
//     },
//     children: [
//       {
//         element: {
//           type: "column",
//           justifyContent: "justify-end",
//           width: {
//             type: "fill",
//           },
//           style: {},
//         },
//         children: [
//           {
//             element: {
//               type: "button",
//               data: {
//                 text: "Prev",
//                 type: "secondary",
//                 action: "next",
//               },
//             },
//             children: null,
//           },
//           {
//             element: {
//               type: "button",
//               data: {
//                 text: "Next",
//                 type: "",
//                 action: "next",
//               },
//               margin: {
//                 top: "0",
//                 left: "10",
//                 bottom: 0,
//                 right: 0,
//                 enabled: true,
//               },
//             },
//             children: null,
//           },
//         ],
//       },
//     ],
//   },
// ];

export const createValue4 = createValue3;
export const createValue5 = [
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
];
export const createValue6 = [
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
];

export const surveysValue = [
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
];

// Helper function to check if type is restricted
export const isRestrictedType = (type: ContentEditorElementType): boolean => {
  const restrictedTypes = [
    ContentEditorElementType.NPS,
    ContentEditorElementType.STAR_RATING,
    ContentEditorElementType.SCALE,
    ContentEditorElementType.SINGLE_LINE_TEXT,
    ContentEditorElementType.MULTI_LINE_TEXT,
    ContentEditorElementType.MULTIPLE_CHOICE,
  ];
  return restrictedTypes.includes(type);
};

export const isMissingRequiredData = (element: ContentEditorElement) => {
  if (isRestrictedType(element.type)) {
    return isEmptyString((element as ContentEditorQuestionElement).data?.name);
  }
  if (element.type === ContentEditorElementType.BUTTON) {
    if (isEmptyString((element as any).data?.text)) {
      return true;
    }
    if (!element?.data?.actions || element?.data?.actions.length === 0) {
      return true;
    }
  }
  return false;
};

export const hasMissingRequiredData = (contents: ContentEditorRoot[]) => {
  // If the new element is a restricted type, check if any restricted type already exists
  return contents.some((group) =>
    group.children.some((column) =>
      column.children.some((item) => isMissingRequiredData(item.element)),
    ),
  );
};

export const isQuestionElement = (element: ContentEditorElement) => {
  return (
    element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
    element.type === ContentEditorElementType.MULTI_LINE_TEXT ||
    element.type === ContentEditorElementType.NPS ||
    element.type === ContentEditorElementType.STAR_RATING ||
    element.type === ContentEditorElementType.SCALE ||
    element.type === ContentEditorElementType.MULTIPLE_CHOICE
  );
};

export const isClickableElement = (element: ContentEditorClickableElement) => {
  return element.type === ContentEditorElementType.BUTTON || isQuestionElement(element);
};

export const extractQuestionData = (data: ContentEditorRoot[]): ContentEditorQuestionElement[] => {
  const result: ContentEditorQuestionElement[] = [];

  function isQuestionRootElement(item: any): item is { element: ContentEditorQuestionElement } {
    return 'element' in item && isQuestionElement(item.element);
  }

  function traverse(item: ContentEditorRoot | ContentEditorRootColumn | ContentEditorRootElement) {
    if (isQuestionRootElement(item)) {
      result.push(item.element);
    }

    if ('children' in item && item.children) {
      for (const child of item.children) {
        traverse(child);
      }
    }
  }

  for (const item of data) {
    traverse(item);
  }

  return result;
};

// Create base step data based on type
export const getDefaultDataForType = (type: string) => {
  switch (type) {
    case 'modal':
      return createValue4; // Use createValue4 for modal (has image and buttons)
    case 'hidden':
      return createValue2; // Use createValue2 for hidden (has buttons)
    default:
      return createValue1; // Use createValue1 for tooltip (simple text)
  }
};

// Helper function to create a copy of a step
export const createStepCopy = (originalStep: Step, sequence: number): Step => {
  const { id, cvid, updatedAt, data, createdAt, ...rest } = originalStep;

  // Process question elements to replace cvid with new cuid
  const processQuestionElements = (contents: ContentEditorRoot[]): ContentEditorRoot[] => {
    return contents.map((group) => ({
      ...group,
      children: group.children.map((column) => ({
        ...column,
        children: column.children.map((item) => {
          if (isQuestionElement(item.element)) {
            const questionElement = item.element as ContentEditorQuestionElement;
            return {
              ...item,
              element: {
                ...questionElement,
                data: {
                  ...questionElement.data,
                  cvid: cuid(),
                },
              } as ContentEditorQuestionElement,
            };
          }
          return item;
        }),
      })),
    }));
  };

  // Check if data exists and is an array that can be processed
  let processedData = data;
  try {
    processedData = data && Array.isArray(data) ? processQuestionElements(data) : data;
  } catch (error) {
    console.error('Error processing step data during copy:', error);
    // Fallback to original data if processing fails
    processedData = data;
  }

  return {
    ...rest,
    data: processedData,
    name: `${originalStep.name} (copy)`,
    sequence,
  };
};
