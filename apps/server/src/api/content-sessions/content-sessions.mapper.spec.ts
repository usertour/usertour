import {
  BizEvents,
  ContentDataType,
  ContentEditorElementType,
  EventAttributes,
} from '@usertour/types';

import { mapContentSession, mapSessionAnswers } from './content-sessions.mapper';

// The honest lifecycle derivation: `completed` reads a genuine completion EVENT
// (never state === 1), `endedAt`/`endReason` describe the close. These fabricate
// the loaded session shape (with its scoped lifecycle events) the mapper receives.
const T0 = new Date('2026-07-19T10:00:00.000Z');
const T1 = new Date('2026-07-19T10:05:00.000Z');

const ev = (codeName: string, createdAt: Date, data: Record<string, unknown> = {}) => ({
  event: { codeName },
  createdAt,
  data,
});

const session = (over: Record<string, unknown>) => ({
  id: 's1',
  state: 0,
  progress: 0,
  contentId: 'c1',
  versionId: 'v1',
  createdAt: T0,
  updatedAt: T1,
  content: { type: ContentDataType.FLOW },
  bizUser: { externalId: 'u1' },
  bizCompany: null,
  bizEvent: [],
  ...over,
});

describe('mapContentSession — honest lifecycle', () => {
  it('flow completed but still open (state 0 + flow_completed) → completed, not ended', () => {
    const out = mapContentSession(
      session({ state: 0, bizEvent: [ev(BizEvents.FLOW_COMPLETED, T1)] }),
      [],
      null,
    );
    expect(out.completed).toBe(true);
    expect(out.completedAt).toBe(T1.toISOString());
    expect(out.endedAt).toBeNull(); // still active
    expect(out.endReason).toBeNull();
  });

  it('flow dismissed (state 1 + flow_ended, no completion) → NOT completed, ended with reason', () => {
    const out = mapContentSession(
      session({
        state: 1,
        bizEvent: [
          ev(BizEvents.FLOW_ENDED, T1, { [EventAttributes.FLOW_END_REASON]: 'user_closed' }),
        ],
      }),
      [],
      null,
    );
    expect(out.completed).toBe(false);
    expect(out.completedAt).toBeNull();
    expect(out.endedAt).toBe(T1.toISOString());
    expect(out.endReason).toBe('user_closed');
  });

  it('flow completed AND ended → completed + ended (both timestamps)', () => {
    const out = mapContentSession(
      session({
        state: 1,
        bizEvent: [
          ev(BizEvents.FLOW_COMPLETED, T0),
          ev(BizEvents.FLOW_ENDED, T1, { [EventAttributes.FLOW_END_REASON]: 'end_from_program' }),
        ],
      }),
      [],
      null,
    );
    expect(out.completed).toBe(true);
    expect(out.completedAt).toBe(T0.toISOString());
    expect(out.endedAt).toBe(T1.toISOString());
    expect(out.endReason).toBe('end_from_program');
  });

  it('a banner has no completion concept — dismissed reads endReason, completed stays false', () => {
    const out = mapContentSession(
      session({
        state: 1,
        content: { type: ContentDataType.BANNER },
        bizEvent: [
          ev(BizEvents.BANNER_DISMISSED, T1, {
            [EventAttributes.BANNER_END_REASON]: 'close_button_dismiss',
          }),
        ],
      }),
      [],
      null,
    );
    expect(out.completed).toBe(false);
    expect(out.endedAt).toBe(T1.toISOString());
    expect(out.endReason).toBe('close_button_dismiss');
  });

  it('a fresh session (state 0, no events) is not completed and not ended', () => {
    const out = mapContentSession(session({ state: 0, bizEvent: [] }), [], null);
    expect(out.completed).toBe(false);
    expect(out.completedAt).toBeNull();
    expect(out.endedAt).toBeNull();
    expect(out.endReason).toBeNull();
  });

  it('ended without a captured end event still reports endedAt (falls back to updatedAt)', () => {
    const out = mapContentSession(session({ state: 1, bizEvent: [] }), [], null);
    expect(out.endedAt).toBe(T1.toISOString());
    expect(out.endReason).toBeNull();
  });
});

// A step carrying one question element, in the ContentEditorRoot[] shape
// extractQuestionData reads (root node -> `element` with type + data.cvid/name).
const step = (type: ContentEditorElementType, cvid: string, name = 'Q') => ({
  data: [{ element: { type, data: { cvid, name } } }],
});
// A raw analytics answer row (the three typed columns default to empty/null).
const answer = (cvid: string, over: Record<string, unknown>) => ({
  id: `ans-${cvid}`,
  cvid,
  createdAt: T0,
  numberAnswer: null as number | null,
  textAnswer: null as string | null,
  listAnswer: [] as string[],
  ...over,
});

describe('mapSessionAnswers — typed by question type', () => {
  it('a number question (nps) yields a number, not a string', () => {
    const [out] = mapSessionAnswers(
      [answer('q_nps', { numberAnswer: 9 })],
      [step(ContentEditorElementType.NPS, 'q_nps')],
    );
    expect(out.answerType).toBe('nps');
    expect(out.answerValue).toBe(9);
    expect(typeof out.answerValue).toBe('number');
  });

  it('a scale answer of 0 survives (selected by type, not by truthiness)', () => {
    const [out] = mapSessionAnswers(
      [answer('q_scale', { numberAnswer: 0 })],
      [step(ContentEditorElementType.SCALE, 'q_scale')],
    );
    expect(out.answerValue).toBe(0);
  });

  it('a text question yields the string', () => {
    const [out] = mapSessionAnswers(
      [answer('q_txt', { textAnswer: 'Loved it' })],
      [step(ContentEditorElementType.SINGLE_LINE_TEXT, 'q_txt')],
    );
    expect(out.answerValue).toBe('Loved it');
  });

  it('a multiple-choice question yields the option array, not a JSON string', () => {
    const [out] = mapSessionAnswers(
      [answer('q_mc', { listAnswer: ['email', 'docs'] })],
      [step(ContentEditorElementType.MULTIPLE_CHOICE, 'q_mc')],
    );
    expect(Array.isArray(out.answerValue)).toBe(true);
    expect(out.answerValue).toEqual(['email', 'docs']);
  });

  it('drops an answer whose cvid matches no question in the version', () => {
    const out = mapSessionAnswers(
      [answer('orphan', { numberAnswer: 3 })],
      [step(ContentEditorElementType.NPS, 'q_nps')],
    );
    expect(out).toEqual([]);
  });
});
