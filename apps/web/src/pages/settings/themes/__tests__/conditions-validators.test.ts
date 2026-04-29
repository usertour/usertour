import {
  AttributeBizTypes,
  AttributeDataType,
  EventCountLogic,
  EventTimeLogic,
} from '@usertour/types';
import {
  validateConditionByType,
  validateContent,
  validateCurrentPage,
  validateElement,
  validateEvent,
  validateEventAttr,
  validateSegment,
  validateTextFill,
  validateTextInput,
  validateTime,
  validateUserAttr,
} from '../../../../../../../packages/shared/components/src/components/conditions/validators';
import { validateConditions } from '../../../../../../../packages/shared/components/src/components/conditions/validate';
import type { Attribute, Content, RulesCondition, Segment } from '@usertour/types';

// Pure-data tests — these mirror what the editors emit so a bad commit can't
// silently slip a malformed condition past the save handler.

const userAttribute = (over: Partial<Attribute> = {}): Attribute => ({
  id: 'attr-user-1',
  bizType: AttributeBizTypes.User,
  projectId: 'proj-1',
  displayName: 'Email',
  codeName: 'email',
  description: '',
  dataType: AttributeDataType.String,
  createdAt: '2024-01-01',
  predefined: true,
  ...over,
});

const eventAttribute = (over: Partial<Attribute> = {}): Attribute => ({
  ...userAttribute(),
  id: 'attr-event-1',
  bizType: AttributeBizTypes.Event,
  ...over,
});

describe('validateUserAttr', () => {
  it('flags missing attrId', () => {
    expect(validateUserAttr({}, [userAttribute()])).toEqual({
      key: 'conditions.errors.userAttr.selectAttribute',
    });
  });

  it('flags attrId that is not in the attributes list', () => {
    expect(validateUserAttr({ attrId: 'unknown' }, [userAttribute()])).toEqual({
      key: 'conditions.errors.userAttr.selectAttribute',
    });
  });

  it('flags missing operator once attribute is selected', () => {
    expect(validateUserAttr({ attrId: 'attr-user-1' }, [userAttribute()])).toEqual({
      key: 'conditions.errors.userAttr.selectOperator',
    });
  });

  it('passes for valueless ops without a value', () => {
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'any' }, [userAttribute()]),
    ).toBeUndefined();
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'empty' }, [userAttribute()]),
    ).toBeUndefined();
  });

  it('flags between without both bounds', () => {
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'between', value: '1' }, [
        userAttribute({ dataType: AttributeDataType.Number }),
      ]),
    ).toEqual({ key: 'conditions.errors.userAttr.enterValue' });
  });

  it('passes between when both bounds are set', () => {
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'between', value: '1', value2: '5' }, [
        userAttribute({ dataType: AttributeDataType.Number }),
      ]),
    ).toBeUndefined();
  });

  it('flags list datatype with no listValues', () => {
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'includesAtLeastOne' }, [
        userAttribute({ dataType: AttributeDataType.List }),
      ]),
    ).toEqual({ key: 'conditions.errors.userAttr.enterValue' });
  });

  it('passes list datatype with at least one value', () => {
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'includesAtLeastOne', listValues: ['a'] }, [
        userAttribute({ dataType: AttributeDataType.List }),
      ]),
    ).toBeUndefined();
  });

  it('flags non-list datatype with empty value', () => {
    expect(
      validateUserAttr({ attrId: 'attr-user-1', logic: 'is', value: '' }, [userAttribute()]),
    ).toEqual({ key: 'conditions.errors.userAttr.enterValue' });
  });
});

describe('validateCurrentPage', () => {
  it('flags empty includes and excludes', () => {
    expect(validateCurrentPage({})).toEqual({
      key: 'conditions.errors.currentPage.enterPattern',
    });
    expect(validateCurrentPage({ includes: [], excludes: [] })).toEqual({
      key: 'conditions.errors.currentPage.enterPattern',
    });
    expect(validateCurrentPage({ includes: ['', '   '] })).toEqual({
      key: 'conditions.errors.currentPage.enterPattern',
    });
  });

  it('passes when at least one trimmed include or exclude is non-empty', () => {
    expect(validateCurrentPage({ includes: ['/dashboard'] })).toBeUndefined();
    expect(validateCurrentPage({ excludes: ['/admin'] })).toBeUndefined();
    expect(validateCurrentPage({ includes: [''], excludes: ['/foo'] })).toBeUndefined();
  });
});

describe('validateSegment', () => {
  const segment: Segment = { id: 'seg-1', bizType: 'USER', name: 'Power users' } as Segment;

  it('flags missing segmentId', () => {
    expect(validateSegment({}, [segment])).toEqual({
      key: 'conditions.errors.segment.selectSegment',
    });
  });

  it('flags segmentId not in list', () => {
    expect(validateSegment({ segmentId: 'unknown' }, [segment])).toEqual({
      key: 'conditions.errors.segment.selectSegment',
    });
  });

  it('passes when segmentId resolves', () => {
    expect(validateSegment({ segmentId: 'seg-1' }, [segment])).toBeUndefined();
  });
});

describe('validateContent', () => {
  const content = { id: 'flow-1', name: 'Onboarding', type: 'flow' } as unknown as Content;

  it('flags missing contentId', () => {
    expect(validateContent({}, [content])).toEqual({
      key: 'conditions.errors.content.selectContent',
    });
  });

  it('flags contentId not in list', () => {
    expect(validateContent({ contentId: 'missing' }, [content])).toEqual({
      key: 'conditions.errors.content.selectContent',
    });
  });

  it('passes when contentId resolves', () => {
    expect(validateContent({ contentId: 'flow-1' }, [content])).toBeUndefined();
  });
});

describe('validateElement / validateTextFill', () => {
  it('flags element with no selection', () => {
    expect(validateElement({})).toEqual({
      key: 'conditions.errors.element.selectElement',
    });
    expect(validateElement({ elementData: { type: 'auto' } })).toEqual({
      key: 'conditions.errors.element.selectElement',
    });
    expect(
      validateElement({ elementData: { type: 'manual', content: '', customSelector: '' } }),
    ).toEqual({ key: 'conditions.errors.element.selectElement' });
  });

  it('passes when auto has a screenshot', () => {
    expect(
      validateElement({ elementData: { type: 'auto', screenshot: 'data:...' } }),
    ).toBeUndefined();
  });

  it('passes when manual has content or customSelector', () => {
    expect(validateElement({ elementData: { type: 'manual', content: 'Submit' } })).toBeUndefined();
    expect(
      validateElement({ elementData: { type: 'manual', customSelector: '.btn' } }),
    ).toBeUndefined();
  });

  it('text-fill mirrors element selection', () => {
    expect(validateTextFill({})).toEqual({
      key: 'conditions.errors.element.selectElement',
    });
    expect(
      validateTextFill({ elementData: { type: 'manual', customSelector: '.input' } }),
    ).toBeUndefined();
  });
});

describe('validateTextInput', () => {
  const goodElement = { type: 'manual', customSelector: '.input' };

  it('flags missing element', () => {
    expect(validateTextInput({ logic: 'is', value: 'foo' })).toEqual({
      key: 'conditions.errors.element.selectElement',
    });
  });

  it('flags missing value for non-valueless ops', () => {
    expect(validateTextInput({ elementData: goodElement, logic: 'is', value: '' })).toEqual({
      key: 'conditions.errors.userAttr.enterValue',
    });
  });

  it('passes for valueless ops', () => {
    expect(validateTextInput({ elementData: goodElement, logic: 'any' })).toBeUndefined();
    expect(validateTextInput({ elementData: goodElement, logic: 'empty' })).toBeUndefined();
  });

  it('passes when element + value present', () => {
    expect(
      validateTextInput({ elementData: goodElement, logic: 'is', value: 'hi' }),
    ).toBeUndefined();
  });
});

describe('validateTime', () => {
  it('flags empty data', () => {
    expect(validateTime(undefined)).toEqual({
      key: 'conditions.errors.time.enterRange',
    });
    expect(validateTime({} as never)).toEqual({
      key: 'conditions.errors.time.enterRange',
    });
  });

  it('passes for V2 with startTime', () => {
    expect(validateTime({ startTime: '2024-01-01T00:00:00Z' } as never)).toBeUndefined();
  });

  it('passes for legacy with startDate', () => {
    expect(validateTime({ startDate: '01/01/2024' } as never)).toBeUndefined();
  });
});

describe('validateEvent', () => {
  it('flags missing eventId', () => {
    expect(validateEvent({})).toEqual({ key: 'conditions.errors.event.selectEvent' });
  });

  it('flags missing count once event is set', () => {
    expect(validateEvent({ eventId: 'evt-1' })).toEqual({
      key: 'conditions.errors.event.enterCount',
    });
  });

  it('flags BETWEEN count without count2', () => {
    expect(
      validateEvent({
        eventId: 'evt-1',
        count: 1,
        countLogic: EventCountLogic.BETWEEN,
        timeLogic: EventTimeLogic.AT_ANY_POINT_IN_TIME,
      }),
    ).toEqual({ key: 'conditions.errors.event.enterSecondCount' });
  });

  it('flags missing windowValue when timeLogic is not at-any-point', () => {
    expect(
      validateEvent({
        eventId: 'evt-1',
        count: 1,
        countLogic: EventCountLogic.AT_LEAST,
        timeLogic: EventTimeLogic.IN_THE_LAST,
      }),
    ).toEqual({ key: 'conditions.errors.event.enterTimeWindow' });
  });

  it('passes for fully populated AT_LEAST + AT_ANY_POINT', () => {
    expect(
      validateEvent({
        eventId: 'evt-1',
        count: 2,
        countLogic: EventCountLogic.AT_LEAST,
        timeLogic: EventTimeLogic.AT_ANY_POINT_IN_TIME,
      }),
    ).toBeUndefined();
  });
});

describe('validateEventAttr', () => {
  it('flags non-event-bizType attributes as invalid', () => {
    expect(
      validateEventAttr({ attrId: 'attr-user-1', logic: 'is', value: 'x' }, [userAttribute()]),
    ).toEqual({ key: 'conditions.errors.eventAttr.selectAttribute' });
  });

  it('passes for event-bizType attribute with value', () => {
    expect(
      validateEventAttr({ attrId: 'attr-event-1', logic: 'is', value: 'x' }, [eventAttribute()]),
    ).toBeUndefined();
  });
});

describe('validateConditions (recursive walker)', () => {
  // The walker has to recurse into both `group.conditions` and
  // `event.data.whereConditions` — the latter was a real gap that let
  // invalid where children sneak past v1's hasError parity.

  it('returns no failures for a fully valid list', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'c1',
        type: 'current-page',
        data: { includes: ['/dashboard'] },
      } as RulesCondition,
    ];
    expect(validateConditions(conditions, {})).toEqual([]);
  });

  it('recurses into group.conditions', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'g1',
        type: 'group',
        data: {},
        conditions: [
          { id: 'inner', type: 'current-page', data: { includes: [] } } as RulesCondition,
        ],
      } as RulesCondition,
    ];
    expect(validateConditions(conditions, {})).toEqual([
      { conditionId: 'inner', error: { key: 'conditions.errors.currentPage.enterPattern' } },
    ]);
  });

  it('recurses into event.data.whereConditions', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'evt-1',
        type: 'event',
        data: {
          eventId: 'e1',
          count: 1,
          countLogic: 'atLeast',
          timeLogic: 'atAnyPointInTime',
          whereConditions: [{ id: 'wattr', type: 'event-attr', data: {} } as RulesCondition],
        },
      } as RulesCondition,
    ];
    const failures = validateConditions(conditions, {});
    expect(failures).toEqual([
      { conditionId: 'wattr', error: { key: 'conditions.errors.eventAttr.selectAttribute' } },
    ]);
  });

  it('recurses into where → group → event-attr (deep)', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'evt-1',
        type: 'event',
        data: {
          eventId: 'e1',
          count: 1,
          countLogic: 'atLeast',
          timeLogic: 'atAnyPointInTime',
          whereConditions: [
            {
              id: 'g',
              type: 'group',
              data: {},
              conditions: [{ id: 'deep', type: 'event-attr', data: {} } as RulesCondition],
            } as RulesCondition,
          ],
        },
      } as RulesCondition,
    ];
    expect(validateConditions(conditions, {})).toEqual([
      { conditionId: 'deep', error: { key: 'conditions.errors.eventAttr.selectAttribute' } },
    ]);
  });
});

describe('validateConditionByType (dispatch)', () => {
  const cases: Array<[string, RulesCondition, ReturnType<typeof validateConditionByType>]> = [
    [
      'user-attr (missing attribute)',
      { id: 'c1', type: 'user-attr', data: {} } as RulesCondition,
      { key: 'conditions.errors.userAttr.selectAttribute' },
    ],
    [
      'current-page (no patterns)',
      { id: 'c2', type: 'current-page', data: { includes: [], excludes: [] } } as RulesCondition,
      { key: 'conditions.errors.currentPage.enterPattern' },
    ],
    [
      'task-is-clicked (no validator → undefined)',
      { id: 'c3', type: 'task-is-clicked', data: {} } as RulesCondition,
      undefined,
    ],
    [
      'group (always undefined at this layer)',
      { id: 'c4', type: 'group', data: {}, conditions: [] } as RulesCondition,
      undefined,
    ],
    [
      'unknown type → undefined',
      { id: 'c5', type: 'made-up', data: {} } as RulesCondition,
      undefined,
    ],
  ];

  for (const [name, condition, expected] of cases) {
    it(name, () => {
      expect(validateConditionByType(condition, {})).toEqual(expected);
    });
  }
});
