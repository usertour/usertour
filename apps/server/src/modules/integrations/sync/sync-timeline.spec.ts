import { BizEvents, EventAttributes } from '@usertour/types';
import { timelineEventTypeName, timelinePropertiesFor } from './sync-timeline';

describe('timeline occurrences', () => {
  it('names the event type per object', () => {
    expect(timelineEventTypeName(BizEvents.FLOW_STARTED, 'contact')).toBe('flow_started_contact');
    expect(timelineEventTypeName(BizEvents.FLOW_STARTED, 'company')).toBe('flow_started_company');
  });

  it('carries only declared, filled-in properties, plus the user id and page', () => {
    const properties = timelinePropertiesFor(
      BizEvents.FLOW_ENDED,
      {
        [EventAttributes.FLOW_NAME]: 'Onboarding',
        [EventAttributes.FLOW_VERSION_NUMBER]: 4,
        [EventAttributes.FLOW_END_REASON]: 'action_dismiss',
        [EventAttributes.FLOW_STEP_NAME]: 'How likely to recommend',
        [EventAttributes.FLOW_STEP_NUMBER]: 3,
        [EventAttributes.PAGE_URL]: 'https://app.example.com',
        [EventAttributes.FLOW_ID]: 'ignored',
      },
      'u_1',
    );
    expect(properties).toEqual({
      flow_name: 'Onboarding',
      flow_version: 4,
      flow_end_reason: 'dismissed',
      flow_step_name: 'How likely to recommend',
      flow_step_number: 3,
      usertour_user_id: 'u_1',
      page_url: 'https://app.example.com',
    });
  });

  it('spells an unknown end reason out instead of dropping it', () => {
    expect(
      timelinePropertiesFor(BizEvents.FLOW_ENDED, { flow_end_reason: 'something_new' }, 'u')
        .flow_end_reason,
    ).toBe('something new');
  });

  it('turns a survey answer into text and score', () => {
    expect(
      timelinePropertiesFor(
        BizEvents.QUESTION_ANSWERED,
        {
          [EventAttributes.QUESTION_NAME]: 'dashboard_nps',
          [EventAttributes.QUESTION_TYPE]: 'nps',
          [EventAttributes.NUMBER_ANSWER]: 8,
        },
        'u',
      ),
    ).toEqual({
      question_name: 'dashboard_nps',
      question_type: 'nps',
      answer: '8',
      score: 8,
      usertour_user_id: 'u',
    });
    expect(
      timelinePropertiesFor(
        BizEvents.QUESTION_ANSWERED,
        { [EventAttributes.LIST_ANSWER]: ['Price', 'Speed'] },
        'u',
      ).answer,
    ).toBe('Price, Speed');
  });
});
