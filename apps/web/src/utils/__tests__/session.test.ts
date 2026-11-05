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
  it("prints an embed step number and version number one-based, as a flow's are", () => {
    expect(getFieldValue(EventAttributes.FLOW_STEP_NUMBER, 1)).toBe(2);
    expect(getFieldValue(EventAttributes.EMBED_STEP_NUMBER, 1)).toBe(2);
    expect(getFieldValue(EventAttributes.FLOW_VERSION_NUMBER, 0)).toBe(1);
    expect(getFieldValue(EventAttributes.EMBED_VERSION_NUMBER, 0)).toBe(1);
  });

  it('prints an embed start and end reason as its title', () => {
    expect(
      getFieldValue(EventAttributes.EMBED_START_REASON, contentStartReason.START_FROM_CONDITION),
    ).toBe('Matched auto-start condition');
    expect(getFieldValue(EventAttributes.EMBED_END_REASON, contentEndReason.DISMISS_BUTTON)).toBe(
      'Dismissed by dismiss button',
    );
  });
});
