import {
  BizEvents,
  ContentDataType,
  EventAttributes,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { type BizEvent } from '@usertour/data';

jest.mock('@usertour/helpers', () => ({
  extractQuestionData: () => [],
}));

jest.mock('@/components/editor/utils/config', () => ({
  contentTypesConfig: [],
}));

import { getEventDisplaySuffix, getFieldValue, getStartReasonTitle } from '../session';

const createEvent = (codeName: BizEvents, data: Record<string, unknown> = {}): BizEvent =>
  ({
    data,
    createdAt: '2026-03-05T10:27:41.000Z',
    event: { codeName },
  }) as BizEvent;

const session = { content: { name: 'Scheduled exports' } };

describe('getEventDisplaySuffix', () => {
  it('names the step of a flow step event', () => {
    const event = createEvent(BizEvents.FLOW_STEP_SEEN, {
      [EventAttributes.FLOW_STEP_NUMBER]: 1,
      [EventAttributes.FLOW_STEP_NAME]: 'Details',
    });
    expect(getEventDisplaySuffix(event, session)).toBe('Step 2. Details');
  });

  it('names the step of an embed step event, as it does for a flow', () => {
    const event = createEvent(BizEvents.EMBED_STEP_SEEN, {
      [EventAttributes.EMBED_STEP_NUMBER]: 1,
      [EventAttributes.EMBED_STEP_NAME]: 'Details',
    });
    expect(getEventDisplaySuffix(event, session)).toBe('Step 2. Details');
  });

  it('names the button of a button press', () => {
    const event = createEvent(BizEvents.BUTTON_CLICKED, {
      [EventAttributes.BUTTON_TEXT]: 'Got it',
    });
    expect(getEventDisplaySuffix(event, session)).toBe('Got it');
  });

  it('falls back to the content name for a button press without a text', () => {
    const event = createEvent(BizEvents.BUTTON_CLICKED, {});
    expect(getEventDisplaySuffix(event, session)).toBe('Scheduled exports');
  });
});

describe('getStartReasonTitle', () => {
  it('reads the recorded start reason of an embed, as it does for a flow', () => {
    const startEvent = createEvent(BizEvents.EMBED_STARTED, {
      [EventAttributes.EMBED_START_REASON]: contentStartReason.START_FROM_CONDITION,
    });
    expect(getStartReasonTitle(ContentDataType.EMBED, startEvent)).toBe(
      'Matched auto-start condition',
    );
  });
});

describe('getFieldValue', () => {
  // A version number is the version's zero-based sequence, whatever the type.
  it.each([
    EventAttributes.FLOW_VERSION_NUMBER,
    EventAttributes.CHECKLIST_VERSION_NUMBER,
    EventAttributes.LAUNCHER_VERSION_NUMBER,
    EventAttributes.BANNER_VERSION_NUMBER,
    EventAttributes.EMBED_VERSION_NUMBER,
    EventAttributes.RESOURCE_CENTER_VERSION_NUMBER,
    EventAttributes.EVENT_TRACKER_VERSION_NUMBER,
    EventAttributes.ANNOUNCEMENT_VERSION_NUMBER,
  ])('prints %s one-based', (attribute) => {
    expect(getFieldValue(attribute, 0)).toBe(1);
    expect(getFieldValue(attribute, 3)).toBe(4);
  });

  it.each([EventAttributes.FLOW_STEP_NUMBER, EventAttributes.EMBED_STEP_NUMBER])(
    'prints %s one-based',
    (attribute) => {
      expect(getFieldValue(attribute, 1)).toBe(2);
    },
  );

  it.each([
    EventAttributes.FLOW_START_REASON,
    EventAttributes.CHECKLIST_START_REASON,
    EventAttributes.LAUNCHER_START_REASON,
    EventAttributes.EMBED_START_REASON,
    EventAttributes.RESOURCE_CENTER_START_REASON,
  ])('prints %s as the title of the reason', (attribute) => {
    expect(getFieldValue(attribute, contentStartReason.START_FROM_CONDITION)).toBe(
      'Matched auto-start condition',
    );
  });

  it.each([
    EventAttributes.FLOW_END_REASON,
    EventAttributes.CHECKLIST_END_REASON,
    EventAttributes.LAUNCHER_END_REASON,
    EventAttributes.BANNER_END_REASON,
    EventAttributes.EMBED_END_REASON,
    EventAttributes.RESOURCE_CENTER_END_REASON,
  ])('prints %s as the title of the reason', (attribute) => {
    expect(getFieldValue(attribute, contentEndReason.ADMIN_ENDED)).toBe('Ended by admin');
    expect(getFieldValue(attribute, contentEndReason.DISMISS_BUTTON)).toBe(
      'Dismissed by dismiss button',
    );
  });

  it('keeps a reason it has no title for, and an absent number', () => {
    expect(getFieldValue(EventAttributes.CHECKLIST_END_REASON, 'dismissed')).toBe('dismissed');
    expect(getFieldValue(EventAttributes.FLOW_VERSION_NUMBER, undefined)).toBeUndefined();
  });

  it('leaves a custom attribute alone, however it is named', () => {
    expect(getFieldValue('app_version_number', 12)).toBe('12');
    expect(getFieldValue('onboarding_step_number', 2)).toBe('2');
    expect(getFieldValue('churn_end_reason', contentEndReason.ADMIN_ENDED)).toBe('admin_ended');
  });

  // getFieldValue tells a value's kind by the name of its system attribute.
  // A new attribute that ends like one of these but means something else has
  // to be handled there before this passes.
  it('every numbered or reasoned system attribute is of a kind it knows', () => {
    const attributes = Object.values(EventAttributes) as string[];
    const numbered = attributes.filter((attribute) => attribute.endsWith('_number'));
    const reasoned = attributes.filter((attribute) => attribute.endsWith('_reason'));

    expect(numbered.length).toBeGreaterThan(0);
    expect(reasoned.length).toBeGreaterThan(0);
    for (const attribute of numbered) {
      expect(attribute).toMatch(/_(version|step)_number$/);
    }
    for (const attribute of reasoned) {
      expect(attribute).toMatch(/_(start|end)_reason$/);
    }
  });
});
