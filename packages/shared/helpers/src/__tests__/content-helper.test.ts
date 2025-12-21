import { ContentDataType, ContentEditorElementType } from '@usertour/types';
import type {
  ChecklistData,
  ContentConfigObject,
  ContentEditorElement,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  LauncherData,
  RulesCondition,
  Step,
  StepTrigger,
} from '@usertour/types';
import {
  isRestrictedType,
  isMissingRequiredData,
  hasMissingRequiredData,
  isQuestionElement,
  isClickableElement,
  extractQuestionData,
  processQuestionElements,
  generateUniqueCopyName,
  duplicateTriggers,
  duplicateTarget,
  duplicateChecklistData,
  duplicateLauncherData,
  duplicateConfig,
  duplicateData,
  duplicateStep,
} from '../content-helper';

// Mock cuid and uuidV4 to return predictable values
jest.mock('../helper', () => ({
  cuid: jest.fn(() => 'mock-cuid'),
  uuidV4: jest.fn(() => 'mock-uuid'),
}));

// Mock regenerateConditionIds to return modified conditions
jest.mock('../conditions', () => ({
  regenerateConditionIds: jest.fn((conditions) =>
    conditions?.map((c: RulesCondition) => ({ ...c, id: `regenerated-${c.id}` })),
  ),
}));

describe('isRestrictedType', () => {
  test('should return true for NPS type', () => {
    expect(isRestrictedType(ContentEditorElementType.NPS)).toBe(true);
  });

  test('should return true for STAR_RATING type', () => {
    expect(isRestrictedType(ContentEditorElementType.STAR_RATING)).toBe(true);
  });

  test('should return true for SCALE type', () => {
    expect(isRestrictedType(ContentEditorElementType.SCALE)).toBe(true);
  });

  test('should return true for SINGLE_LINE_TEXT type', () => {
    expect(isRestrictedType(ContentEditorElementType.SINGLE_LINE_TEXT)).toBe(true);
  });

  test('should return true for MULTI_LINE_TEXT type', () => {
    expect(isRestrictedType(ContentEditorElementType.MULTI_LINE_TEXT)).toBe(true);
  });

  test('should return true for MULTIPLE_CHOICE type', () => {
    expect(isRestrictedType(ContentEditorElementType.MULTIPLE_CHOICE)).toBe(true);
  });

  test('should return false for BUTTON type', () => {
    expect(isRestrictedType(ContentEditorElementType.BUTTON)).toBe(false);
  });

  test('should return false for TEXT type', () => {
    expect(isRestrictedType(ContentEditorElementType.TEXT)).toBe(false);
  });

  test('should return false for IMAGE type', () => {
    expect(isRestrictedType(ContentEditorElementType.IMAGE)).toBe(false);
  });
});

describe('isMissingRequiredData', () => {
  test('should return true when restricted type element has empty name', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.NPS,
      data: { name: '' },
    } as ContentEditorQuestionElement;
    expect(isMissingRequiredData(element)).toBe(true);
  });

  test('should return false when restricted type element has undefined name (isEmptyString returns false for undefined)', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.NPS,
      data: {},
    } as ContentEditorQuestionElement;
    // Note: isEmptyString only returns true for empty strings, not undefined
    expect(isMissingRequiredData(element)).toBe(false);
  });

  test('should return false when restricted type element has valid name', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'Valid Name' },
    } as ContentEditorQuestionElement;
    expect(isMissingRequiredData(element)).toBe(false);
  });

  test('should return true when button element has empty text', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.BUTTON,
      data: { text: '', actions: [{ id: '1' }] },
    } as unknown as ContentEditorElement;
    expect(isMissingRequiredData(element)).toBe(true);
  });

  test('should return true when button element has no actions', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.BUTTON,
      data: { text: 'Button', actions: [] },
    } as unknown as ContentEditorElement;
    expect(isMissingRequiredData(element)).toBe(true);
  });

  test('should return true when button element has undefined actions', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.BUTTON,
      data: { text: 'Button' },
    } as unknown as ContentEditorElement;
    expect(isMissingRequiredData(element)).toBe(true);
  });

  test('should return false when button element has valid text and actions', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.BUTTON,
      data: { text: 'Button', actions: [{ id: '1' }] },
    } as unknown as ContentEditorElement;
    expect(isMissingRequiredData(element)).toBe(false);
  });

  test('should return false for non-restricted, non-button type', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.TEXT,
      data: {},
    } as ContentEditorElement;
    expect(isMissingRequiredData(element)).toBe(false);
  });
});

describe('hasMissingRequiredData', () => {
  const createContentRoot = (element: ContentEditorElement): ContentEditorRoot[] => [
    {
      type: 'root',
      children: [
        {
          type: 'column',
          children: [
            {
              type: 'element',
              element,
            },
          ],
        },
      ],
    } as unknown as ContentEditorRoot,
  ];

  test('should return true when content has element with missing required data', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.NPS,
      data: { name: '' },
    } as ContentEditorQuestionElement;
    const contents = createContentRoot(element);
    expect(hasMissingRequiredData(contents)).toBe(true);
  });

  test('should return false when all elements have required data', () => {
    const element: ContentEditorElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'Valid Name' },
    } as ContentEditorQuestionElement;
    const contents = createContentRoot(element);
    expect(hasMissingRequiredData(contents)).toBe(false);
  });

  test('should return false for empty contents array', () => {
    expect(hasMissingRequiredData([])).toBe(false);
  });
});

describe('isQuestionElement', () => {
  test('should return true for SINGLE_LINE_TEXT', () => {
    const element = { type: ContentEditorElementType.SINGLE_LINE_TEXT } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(true);
  });

  test('should return true for MULTI_LINE_TEXT', () => {
    const element = { type: ContentEditorElementType.MULTI_LINE_TEXT } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(true);
  });

  test('should return true for NPS', () => {
    const element = { type: ContentEditorElementType.NPS } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(true);
  });

  test('should return true for STAR_RATING', () => {
    const element = { type: ContentEditorElementType.STAR_RATING } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(true);
  });

  test('should return true for SCALE', () => {
    const element = { type: ContentEditorElementType.SCALE } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(true);
  });

  test('should return true for MULTIPLE_CHOICE', () => {
    const element = { type: ContentEditorElementType.MULTIPLE_CHOICE } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(true);
  });

  test('should return false for BUTTON', () => {
    const element = { type: ContentEditorElementType.BUTTON } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(false);
  });

  test('should return false for TEXT', () => {
    const element = { type: ContentEditorElementType.TEXT } as ContentEditorElement;
    expect(isQuestionElement(element)).toBe(false);
  });
});

describe('isClickableElement', () => {
  test('should return true for BUTTON type', () => {
    const element = { type: ContentEditorElementType.BUTTON, data: {} } as any;
    expect(isClickableElement(element)).toBe(true);
  });

  test('should return true for question elements', () => {
    const element = { type: ContentEditorElementType.NPS, data: {} } as any;
    expect(isClickableElement(element)).toBe(true);
  });

  test('should return false for non-clickable elements', () => {
    const element = { type: ContentEditorElementType.TEXT, data: [] } as any;
    expect(isClickableElement(element)).toBe(false);
  });
});

describe('extractQuestionData', () => {
  test('should extract question elements from content', () => {
    const questionElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS Question', cvid: 'test-cvid' },
    } as ContentEditorQuestionElement;

    const contents: ContentEditorRoot[] = [
      {
        type: 'root',
        children: [
          {
            type: 'column',
            children: [
              {
                type: 'element',
                element: questionElement,
              },
            ],
          },
        ],
      } as unknown as ContentEditorRoot,
    ];

    const result = extractQuestionData(contents);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(questionElement);
  });

  test('should return empty array when no question elements exist', () => {
    const textElement: ContentEditorElement = {
      type: ContentEditorElementType.TEXT,
      data: {},
    } as ContentEditorElement;

    const contents: ContentEditorRoot[] = [
      {
        type: 'root',
        children: [
          {
            type: 'column',
            children: [
              {
                type: 'element',
                element: textElement,
              },
            ],
          },
        ],
      } as unknown as ContentEditorRoot,
    ];

    const result = extractQuestionData(contents);
    expect(result).toHaveLength(0);
  });

  test('should return empty array for empty contents', () => {
    const result = extractQuestionData([]);
    expect(result).toHaveLength(0);
  });

  test('should extract multiple question elements', () => {
    const npsElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS' },
    } as ContentEditorQuestionElement;

    const scaleElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.SCALE,
      data: { name: 'Scale' },
    } as ContentEditorQuestionElement;

    const contents: ContentEditorRoot[] = [
      {
        type: 'root',
        children: [
          {
            type: 'column',
            children: [
              { type: 'element', element: npsElement },
              { type: 'element', element: scaleElement },
            ],
          },
        ],
      } as unknown as ContentEditorRoot,
    ];

    const result = extractQuestionData(contents);
    expect(result).toHaveLength(2);
  });
});

describe('processQuestionElements', () => {
  test('should return empty array for undefined contents', () => {
    const result = processQuestionElements(undefined);
    expect(result).toEqual([]);
  });

  test('should return empty array for empty contents', () => {
    const result = processQuestionElements([]);
    expect(result).toEqual([]);
  });

  test('should regenerate cvid for question elements', () => {
    const questionElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS Question', cvid: 'old-cvid' },
    } as ContentEditorQuestionElement;

    const contents: ContentEditorRoot[] = [
      {
        type: 'root',
        children: [
          {
            type: 'column',
            children: [
              {
                type: 'element',
                element: questionElement,
              },
            ],
          },
        ],
      } as unknown as ContentEditorRoot,
    ];

    const result = processQuestionElements(contents);
    const processedElement = result[0].children[0].children[0]
      .element as ContentEditorQuestionElement;
    expect(processedElement.data.cvid).toBe('mock-cuid');
  });

  test('should regenerate actions for button elements', () => {
    const buttonElement: ContentEditorElement = {
      type: ContentEditorElementType.BUTTON,
      data: {
        text: 'Button',
        actions: [{ id: 'action-1', type: 'test' }],
      },
    } as unknown as ContentEditorElement;

    const contents: ContentEditorRoot[] = [
      {
        type: 'root',
        children: [
          {
            type: 'column',
            children: [
              {
                type: 'element',
                element: buttonElement,
              },
            ],
          },
        ],
      } as unknown as ContentEditorRoot,
    ];

    const result = processQuestionElements(contents);
    const processedElement = result[0].children[0].children[0].element as any;
    expect(processedElement.data?.actions[0].id).toBe('regenerated-action-1');
  });

  test('should not modify non-question, non-button elements', () => {
    const textElement = {
      type: ContentEditorElementType.TEXT,
      data: [],
    } as unknown as ContentEditorElement;

    const contents: ContentEditorRoot[] = [
      {
        type: 'root',
        children: [
          {
            type: 'column',
            children: [
              {
                type: 'element',
                element: textElement,
              },
            ],
          },
        ],
      } as unknown as ContentEditorRoot,
    ];

    const result = processQuestionElements(contents);
    const processedElement = result[0].children[0].children[0].element;
    expect(processedElement).toEqual(textElement);
  });
});

describe('generateUniqueCopyName', () => {
  test('should generate "Name (copy)" for first copy', () => {
    const result = generateUniqueCopyName('Test');
    expect(result).toBe('Test (copy)');
  });

  test('should generate "Name (copy)" when no existing names provided', () => {
    const result = generateUniqueCopyName('Test', []);
    expect(result).toBe('Test (copy)');
  });

  test('should generate "Name (copy 2)" when "Name (copy)" exists', () => {
    const result = generateUniqueCopyName('Test', ['Test (copy)']);
    expect(result).toBe('Test (copy 2)');
  });

  test('should generate "Name (copy 3)" when "Name (copy)" and "Name (copy 2)" exist', () => {
    const result = generateUniqueCopyName('Test', ['Test (copy)', 'Test (copy 2)']);
    expect(result).toBe('Test (copy 3)');
  });

  test('should find next available number', () => {
    const result = generateUniqueCopyName('Test', [
      'Test (copy)',
      'Test (copy 2)',
      'Test (copy 3)',
      'Test (copy 4)',
    ]);
    expect(result).toBe('Test (copy 5)');
  });
});

describe('duplicateTriggers', () => {
  test('should return triggers as-is when not an array', () => {
    const result = duplicateTriggers(null as unknown as StepTrigger[]);
    expect(result).toBeNull();
  });

  test('should regenerate trigger IDs', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
        conditions: [{ id: 'condition-1', type: 'test', operators: 'and', data: {} }],
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect(result[0].id).toBe('mock-cuid');
  });

  test('should regenerate action IDs', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
        conditions: [],
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect(result[0].actions[0].id).toBe('regenerated-action-1');
  });

  test('should regenerate condition IDs', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        actions: [],
        conditions: [{ id: 'condition-1', type: 'test', operators: 'and', data: {} }],
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect(result[0].conditions[0].id).toBe('regenerated-condition-1');
  });

  test('should handle triggers without actions or conditions', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect(result[0].id).toBe('mock-cuid');
    expect(result[0].actions).toBeUndefined();
    expect(result[0].conditions).toBeUndefined();
  });

  test('should handle empty array', () => {
    const triggers: StepTrigger[] = [];
    const result = duplicateTriggers(triggers);
    expect(result).toEqual([]);
  });

  test('should handle multiple triggers', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
        conditions: [],
      },
      {
        id: 'trigger-2',
        actions: [],
        conditions: [{ id: 'condition-1', type: 'test', operators: 'and', data: {} }],
      },
    ] as unknown as StepTrigger[];

    const result = duplicateTriggers(triggers);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('mock-cuid');
    expect(result[1].id).toBe('mock-cuid');
    expect(result[0].actions[0].id).toBe('regenerated-action-1');
    expect(result[1].conditions[0].id).toBe('regenerated-condition-1');
  });

  test('should preserve other trigger properties', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        customType: 'click',
        customSelector: '.button',
        delay: 1000,
        actions: [],
        conditions: [],
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect((result[0] as any).customType).toBe('click');
    expect((result[0] as any).customSelector).toBe('.button');
    expect((result[0] as any).delay).toBe(1000);
  });

  test('should handle triggers with non-array actions', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        actions: 'not-an-array',
        conditions: [],
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect(result[0].actions).toBe('not-an-array');
  });

  test('should handle triggers with non-array conditions', () => {
    const triggers: StepTrigger[] = [
      {
        id: 'trigger-1',
        actions: [],
        conditions: 'not-an-array',
      } as unknown as StepTrigger,
    ];

    const result = duplicateTriggers(triggers);
    expect(result[0].conditions).toBe('not-an-array');
  });
});

describe('duplicateTarget', () => {
  test('should return undefined for undefined target', () => {
    const result = duplicateTarget(undefined);
    expect(result).toBeUndefined();
  });

  test('should return undefined for null target', () => {
    const result = duplicateTarget(null as unknown as Step['target']);
    expect(result).toBeUndefined();
  });

  test('should regenerate action IDs in target', () => {
    const target: Step['target'] = {
      actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
    } as unknown as Step['target'];

    const result = duplicateTarget(target);
    expect(result?.actions?.[0].id).toBe('regenerated-action-1');
  });

  test('should return target as-is when no actions', () => {
    const target: Step['target'] = {
      selector: '.test',
    } as unknown as Step['target'];

    const result = duplicateTarget(target);
    expect(result).toEqual(target);
  });

  test('should return target as-is when actions is not an array', () => {
    const target: Step['target'] = {
      actions: 'not-an-array',
    } as unknown as Step['target'];

    const result = duplicateTarget(target);
    expect(result).toEqual(target);
  });

  test('should handle target with empty actions array', () => {
    const target: Step['target'] = {
      selector: '.test',
      actions: [],
    } as unknown as Step['target'];

    const result = duplicateTarget(target);
    expect(result?.actions).toEqual([]);
  });

  test('should handle target with multiple actions', () => {
    const target: Step['target'] = {
      selector: '.test',
      actions: [
        { id: 'action-1', type: 'test1', operators: 'and', data: {} },
        { id: 'action-2', type: 'test2', operators: 'or', data: {} },
      ],
    } as unknown as Step['target'];

    const result = duplicateTarget(target);
    expect(result?.actions).toHaveLength(2);
    expect(result?.actions?.[0].id).toBe('regenerated-action-1');
    expect(result?.actions?.[1].id).toBe('regenerated-action-2');
  });

  test('should preserve other target properties', () => {
    const target: Step['target'] = {
      selectors: ['.test-selector'],
      customPlacement: 'bottom',
      offset: { x: 10, y: 20 },
      actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
    } as unknown as Step['target'];

    const result = duplicateTarget(target);
    expect((result as any)?.selectors).toEqual(['.test-selector']);
    expect((result as any)?.customPlacement).toBe('bottom');
    expect((result as any)?.offset).toEqual({ x: 10, y: 20 });
    expect(result?.actions?.[0].id).toBe('regenerated-action-1');
  });
});

describe('duplicateChecklistData', () => {
  test('should return data as-is for null', () => {
    const result = duplicateChecklistData(null);
    expect(result).toBeNull();
  });

  test('should return data as-is for undefined', () => {
    const result = duplicateChecklistData(undefined);
    expect(result).toBeUndefined();
  });

  test('should return data as-is for non-object', () => {
    const result = duplicateChecklistData('string');
    expect(result).toBe('string');
  });

  test('should return data as-is when items is not an array', () => {
    const data = { items: 'not-an-array' };
    const result = duplicateChecklistData(data);
    expect(result).toEqual(data);
  });

  test('should regenerate item IDs', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          title: 'Task 1',
          clickedActions: [],
          completeConditions: [],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect(result.items[0].id).toBe('mock-uuid');
  });

  test('should regenerate clickedActions IDs', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          clickedActions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
          completeConditions: [],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect(result.items[0].clickedActions[0].id).toBe('regenerated-action-1');
  });

  test('should regenerate completeConditions IDs', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          clickedActions: [],
          completeConditions: [{ id: 'condition-1', type: 'test', operators: 'and', data: {} }],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect(result.items[0].completeConditions[0].id).toBe('regenerated-condition-1');
  });

  test('should regenerate onlyShowTaskConditions IDs', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          clickedActions: [],
          completeConditions: [],
          onlyShowTaskConditions: [{ id: 'condition-1', type: 'test', operators: 'and', data: {} }],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect(result.items[0].onlyShowTaskConditions[0].id).toBe('regenerated-condition-1');
  });

  test('should process content field with question elements', () => {
    const questionElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS Question', cvid: 'old-cvid' },
    } as ContentEditorQuestionElement;

    const data: ChecklistData = {
      content: [
        {
          type: 'root',
          children: [
            {
              type: 'column',
              children: [
                {
                  type: 'element',
                  element: questionElement,
                },
              ],
            },
          ],
        },
      ],
      items: [
        {
          id: 'item-1',
          clickedActions: [],
          completeConditions: [],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    const processedElement = result.content?.[0].children[0].children[0]
      .element as ContentEditorQuestionElement;
    expect(processedElement.data.cvid).toBe('mock-cuid');
  });

  test('should handle multiple items', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          title: 'Task 1',
          clickedActions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
          completeConditions: [],
          onlyShowTaskConditions: [],
        },
        {
          id: 'item-2',
          title: 'Task 2',
          clickedActions: [],
          completeConditions: [{ id: 'condition-2', type: 'test', operators: 'and', data: {} }],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('mock-uuid');
    expect(result.items[1].id).toBe('mock-uuid');
    expect(result.items[0].clickedActions[0].id).toBe('regenerated-action-1');
    expect(result.items[1].completeConditions[0].id).toBe('regenerated-condition-2');
  });

  test('should handle items without conditions arrays', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          title: 'Task 1',
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect(result.items[0].id).toBe('mock-uuid');
    expect(result.items[0].clickedActions).toBeUndefined();
    expect(result.items[0].completeConditions).toBeUndefined();
    expect(result.items[0].onlyShowTaskConditions).toBeUndefined();
  });

  test('should preserve other item properties', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          name: 'Task 1',
          description: 'A task description',
          isCompleted: false,
          clickedActions: [],
          completeConditions: [],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateChecklistData(data) as ChecklistData;
    expect((result.items[0] as any).name).toBe('Task 1');
    expect((result.items[0] as any).description).toBe('A task description');
    expect(result.items[0].isCompleted).toBe(false);
  });
});

describe('duplicateLauncherData', () => {
  test('should return data as-is for null', () => {
    const result = duplicateLauncherData(null);
    expect(result).toBeNull();
  });

  test('should return data as-is for undefined', () => {
    const result = duplicateLauncherData(undefined);
    expect(result).toBeUndefined();
  });

  test('should return data as-is for non-object', () => {
    const result = duplicateLauncherData('string');
    expect(result).toBe('string');
  });

  test('should return data as-is for number', () => {
    const result = duplicateLauncherData(123);
    expect(result).toBe(123);
  });

  test('should regenerate behavior.actions IDs', () => {
    const data: LauncherData = {
      behavior: {
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect(result.behavior?.actions[0].id).toBe('regenerated-action-1');
  });

  test('should handle behavior without actions', () => {
    const data: LauncherData = {
      behavior: {
        behaviorType: 'click',
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect((result.behavior as any)?.behaviorType).toBe('click');
    expect(result.behavior?.actions).toBeUndefined();
  });

  test('should handle behavior with non-array actions', () => {
    const data: LauncherData = {
      behavior: {
        actions: 'not-an-array',
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect(result.behavior?.actions).toBe('not-an-array');
  });

  test('should process tooltip.content with question elements', () => {
    const questionElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS Question', cvid: 'old-cvid' },
    } as ContentEditorQuestionElement;

    const data: LauncherData = {
      tooltip: {
        content: [
          {
            type: 'root',
            children: [
              {
                type: 'column',
                children: [
                  {
                    type: 'element',
                    element: questionElement,
                  },
                ],
              },
            ],
          },
        ],
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    const processedElement = result.tooltip?.content?.[0].children[0].children[0]
      .element as ContentEditorQuestionElement;
    expect(processedElement.data.cvid).toBe('mock-cuid');
  });

  test('should handle data without behavior', () => {
    const data: LauncherData = {
      tooltip: {
        content: [],
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect(result.behavior).toBeUndefined();
    expect(result.tooltip?.content).toEqual([]);
  });

  test('should handle data without tooltip', () => {
    const data: LauncherData = {
      behavior: {
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect(result.tooltip).toBeUndefined();
    expect(result.behavior?.actions[0].id).toBe('regenerated-action-1');
  });

  test('should handle both behavior and tooltip', () => {
    const questionElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS Question', cvid: 'old-cvid' },
    } as ContentEditorQuestionElement;

    const data: LauncherData = {
      behavior: {
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
      },
      tooltip: {
        content: [
          {
            type: 'root',
            children: [
              {
                type: 'column',
                children: [
                  {
                    type: 'element',
                    element: questionElement,
                  },
                ],
              },
            ],
          },
        ],
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect(result.behavior?.actions[0].id).toBe('regenerated-action-1');
    const processedElement = result.tooltip?.content?.[0].children[0].children[0]
      .element as ContentEditorQuestionElement;
    expect(processedElement.data.cvid).toBe('mock-cuid');
  });

  test('should preserve other data properties', () => {
    const data: LauncherData = {
      customProperty: 'value',
      behavior: {
        actions: [],
      },
    } as unknown as LauncherData;

    const result = duplicateLauncherData(data) as LauncherData;
    expect((result as any).customProperty).toBe('value');
  });
});

describe('duplicateConfig', () => {
  test('should return config as-is for null', () => {
    const result = duplicateConfig(null as unknown as ContentConfigObject);
    expect(result).toBeNull();
  });

  test('should return config as-is for undefined', () => {
    const result = duplicateConfig(undefined as unknown as ContentConfigObject);
    expect(result).toBeUndefined();
  });

  test('should regenerate autoStartRules IDs', () => {
    const config: ContentConfigObject = {
      autoStartRules: [{ id: 'rule-1', type: 'test', operators: 'and', data: {} }],
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect(result.autoStartRules?.[0].id).toBe('regenerated-rule-1');
  });

  test('should regenerate hideRules IDs', () => {
    const config: ContentConfigObject = {
      hideRules: [{ id: 'rule-1', type: 'test', operators: 'and', data: {} }],
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect(result.hideRules?.[0].id).toBe('regenerated-rule-1');
  });

  test('should handle config without rules', () => {
    const config: ContentConfigObject = {
      someOtherProperty: 'value',
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect(result.autoStartRules).toBeUndefined();
    expect(result.hideRules).toBeUndefined();
  });

  test('should handle config with both autoStartRules and hideRules', () => {
    const config: ContentConfigObject = {
      autoStartRules: [{ id: 'auto-rule-1', type: 'test', operators: 'and', data: {} }],
      hideRules: [{ id: 'hide-rule-1', type: 'test', operators: 'and', data: {} }],
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect(result.autoStartRules?.[0].id).toBe('regenerated-auto-rule-1');
    expect(result.hideRules?.[0].id).toBe('regenerated-hide-rule-1');
  });

  test('should handle config with empty rules arrays', () => {
    const config: ContentConfigObject = {
      autoStartRules: [],
      hideRules: [],
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect(result.autoStartRules).toEqual([]);
    expect(result.hideRules).toEqual([]);
  });

  test('should preserve other config properties', () => {
    const config: ContentConfigObject = {
      autoStartRules: [{ id: 'rule-1', type: 'test', operators: 'and', data: {} }],
      frequency: 'once',
      dismissible: true,
      priority: 100,
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect((result as any).frequency).toBe('once');
    expect((result as any).dismissible).toBe(true);
    expect((result as any).priority).toBe(100);
  });

  test('should handle config with multiple rules in arrays', () => {
    const config: ContentConfigObject = {
      autoStartRules: [
        { id: 'rule-1', type: 'test1', operators: 'and', data: {} },
        { id: 'rule-2', type: 'test2', operators: 'or', data: {} },
      ],
      hideRules: [
        { id: 'rule-3', type: 'test3', operators: 'and', data: {} },
        { id: 'rule-4', type: 'test4', operators: 'or', data: {} },
      ],
    } as unknown as ContentConfigObject;

    const result = duplicateConfig(config);
    expect(result.autoStartRules).toHaveLength(2);
    expect(result.hideRules).toHaveLength(2);
    expect(result.autoStartRules?.[0].id).toBe('regenerated-rule-1');
    expect(result.autoStartRules?.[1].id).toBe('regenerated-rule-2');
    expect(result.hideRules?.[0].id).toBe('regenerated-rule-3');
    expect(result.hideRules?.[1].id).toBe('regenerated-rule-4');
  });
});

describe('duplicateData', () => {
  test('should process checklist data for CHECKLIST content type', () => {
    const data: ChecklistData = {
      items: [
        {
          id: 'item-1',
          clickedActions: [],
          completeConditions: [],
          onlyShowTaskConditions: [],
        },
      ],
    } as unknown as ChecklistData;

    const result = duplicateData(data, ContentDataType.CHECKLIST) as ChecklistData;
    expect(result.items[0].id).toBe('mock-uuid');
  });

  test('should process launcher data for LAUNCHER content type', () => {
    const data: LauncherData = {
      behavior: {
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
      },
    } as unknown as LauncherData;

    const result = duplicateData(data, ContentDataType.LAUNCHER) as LauncherData;
    expect(result.behavior?.actions[0].id).toBe('regenerated-action-1');
  });

  test('should return data as-is for FLOW content type', () => {
    const data = { someData: 'value' };
    const result = duplicateData(data, 'flow');
    expect(result).toEqual(data);
  });

  test('should return data as-is for unknown content type', () => {
    const data = { someData: 'value' };
    const result = duplicateData(data, 'unknown-type');
    expect(result).toEqual(data);
  });

  test('should return null data as-is', () => {
    const result = duplicateData(null, ContentDataType.CHECKLIST);
    expect(result).toBeNull();
  });

  test('should return undefined data as-is', () => {
    const result = duplicateData(undefined, ContentDataType.LAUNCHER);
    expect(result).toBeUndefined();
  });
});

describe('duplicateStep', () => {
  test('should remove id, createdAt, updatedAt, versionId fields but preserve cvid', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      versionId: 'version-id',
      data: [],
      trigger: [],
      target: undefined,
    };

    const result = duplicateStep(step);
    expect(result).not.toHaveProperty('id');
    expect(result).toHaveProperty('cvid'); // cvid should be preserved
    expect(result.cvid).toBe('step-cvid');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('versionId');
  });

  test('should preserve name and sequence', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 5,
      data: [],
      trigger: [],
      target: undefined,
    };

    const result = duplicateStep(step);
    expect(result.name).toBe('Test Step');
    expect(result.sequence).toBe(5);
  });

  test('should process data field with question elements', () => {
    const questionElement: ContentEditorQuestionElement = {
      type: ContentEditorElementType.NPS,
      data: { name: 'NPS Question', cvid: 'old-cvid' },
    } as ContentEditorQuestionElement;

    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: [
        {
          type: 'root',
          children: [
            {
              type: 'column',
              children: [
                {
                  type: 'element',
                  element: questionElement,
                },
              ],
            },
          ],
        },
      ],
      trigger: [],
      target: undefined,
    };

    const result = duplicateStep(step);
    const processedElement = result.data?.[0].children[0].children[0]
      .element as ContentEditorQuestionElement;
    expect(processedElement.data.cvid).toBe('mock-cuid');
  });

  test('should process trigger field', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: [],
      trigger: [
        {
          id: 'trigger-1',
          actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
          conditions: [{ id: 'condition-1', type: 'test', operators: 'and', data: {} }],
        },
      ],
      target: undefined,
    };

    const result = duplicateStep(step);
    expect(result.trigger?.[0].id).toBe('mock-cuid');
    expect(result.trigger?.[0].actions[0].id).toBe('regenerated-action-1');
    expect(result.trigger?.[0].conditions[0].id).toBe('regenerated-condition-1');
  });

  test('should process target field with actions', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: [],
      trigger: [],
      target: {
        selector: '.test',
        actions: [{ id: 'action-1', type: 'test', operators: 'and', data: {} }],
      },
    };

    const result = duplicateStep(step);
    expect(result.target?.actions?.[0].id).toBe('regenerated-action-1');
    expect(result.target?.selector).toBe('.test');
  });

  test('should return empty array for undefined data', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: undefined,
      trigger: [],
      target: undefined,
    };

    const result = duplicateStep(step);
    expect(result.data).toEqual([]);
  });

  test('should return empty array for undefined trigger', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: [],
      trigger: undefined,
      target: undefined,
    };

    const result = duplicateStep(step);
    expect(result.trigger).toEqual([]);
  });

  test('should return undefined for undefined target', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: [],
      trigger: [],
      target: undefined,
    };

    const result = duplicateStep(step);
    expect(result.target).toBeUndefined();
  });

  test('should preserve custom properties', () => {
    const step = {
      id: 'step-id',
      cvid: 'step-cvid',
      name: 'Test Step',
      sequence: 0,
      data: [],
      trigger: [],
      target: undefined,
      customField: 'custom-value',
      anotherField: 123,
    };

    const result = duplicateStep(step);
    expect(result.customField).toBe('custom-value');
    expect(result.anotherField).toBe(123);
  });
});
