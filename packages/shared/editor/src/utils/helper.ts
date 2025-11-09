import { isArray, regenerateConditionIds, uuidV4 } from '@usertour/helpers';
import {
  ContentEditorClickableElement,
  ContentEditorElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
} from '../types/editor';
import { isEmptyString } from '@usertour/helpers';
import { Step, StepTrigger } from '@usertour/types';
import { cuid } from '@usertour/helpers';

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

/**
 * Process question elements in content editor data to replace cvid with new cuid
 * Also process actions field in all elements (button and question elements) to regenerate condition IDs
 * @param contents - The content editor root array to process
 * @returns A new array with question element cvids replaced by new cuids and actions regenerated
 */
export const processQuestionElements = (
  contents: ContentEditorRoot[] | undefined,
): ContentEditorRoot[] => {
  if (!contents || !isArray(contents) || contents.length === 0) {
    return [];
  }
  return contents.map((group) => ({
    ...group,
    children: group.children.map((column) => ({
      ...column,
      children: column.children.map((item) => {
        const element = item.element;

        // Process question elements: regenerate cvid and actions
        if (isQuestionElement(element)) {
          const questionElement = element as ContentEditorQuestionElement;
          const updatedElement = {
            ...questionElement,
            data: {
              ...questionElement.data,
              cvid: cuid(),
              ...(questionElement.data?.actions && isArray(questionElement.data.actions)
                ? { actions: regenerateConditionIds(questionElement.data.actions) }
                : {}),
            },
          } as ContentEditorQuestionElement;

          return {
            ...item,
            element: updatedElement,
          };
        }

        // Process button elements: regenerate actions
        if (element.type === ContentEditorElementType.BUTTON) {
          const buttonElement = element;
          if (buttonElement.data?.actions && isArray(buttonElement.data.actions)) {
            return {
              ...item,
              element: {
                ...buttonElement,
                data: {
                  ...buttonElement.data,
                  actions: regenerateConditionIds(buttonElement.data.actions),
                },
              },
            };
          }
        }

        return item;
      }),
    })),
  }));
};

export const regenerateTrigger = (trigger: StepTrigger[]): StepTrigger[] => {
  return trigger.map((t) => ({
    ...t,
    id: cuid(),
    conditions: regenerateConditionIds(t.conditions),
    actions: regenerateConditionIds(t.actions),
  }));
};

/**
 * Process target to regenerate condition IDs in actions field
 * @param target - The target object to process
 * @returns A new target object with regenerated action condition IDs, or undefined if target is undefined
 */
export const regenerateTarget = (target: Step['target']): Step['target'] => {
  if (!target) {
    return undefined;
  }

  if (target.actions && isArray(target.actions)) {
    return {
      ...target,
      actions: regenerateConditionIds(target.actions),
    };
  }

  return target;
};

/**
 * Generate a unique copy name based on the original name and existing names
 * @param originalName - The original name to base the copy name on
 * @param existingNames - Optional array of existing names to check against
 * @returns A unique name in the format "Name (copy)", "Name (copy 2)", etc.
 */
export const generateUniqueCopyName = (originalName: string, existingNames?: string[]): string => {
  let name = `${originalName} (copy)`;
  if (existingNames?.includes(name)) {
    let number = 2;
    while (existingNames.includes(`${originalName} (copy ${number})`)) {
      number++;
    }
    name = `${originalName} (copy ${number})`;
  }
  return name;
};

// Helper function to create a copy of a step
export const createStepCopy = (
  originalStep: Step,
  sequence: number,
  existingStepNames?: string[],
): Step => {
  const { id, cvid, updatedAt, createdAt, ...rest } = originalStep;

  const name = generateUniqueCopyName(originalStep?.name, existingStepNames);
  const trigger = originalStep?.trigger ? regenerateTrigger(originalStep?.trigger) : [];
  const data = originalStep?.data ? processQuestionElements(originalStep?.data) : [];
  const target = regenerateTarget(originalStep?.target);

  return {
    ...rest,
    data,
    trigger,
    target,
    name,
    sequence,
  };
};
