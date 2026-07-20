import { AttributeBizTypes, EventAttributes } from '@usertour/types';
import { defaultAttributes, defaultEvents } from '@usertour/constants';

// Every event attribute a default event's list references MUST have a
// matching definition in defaultAttributes (bizType Event) — the seed only
// creates Attribute rows from defaultAttributes, initializationAttributeOnEvent
// only links rows that exist, and filterEventDataByAttributes silently DROPS
// any tracked key without a link. resource_center_start_reason was referenced
// but never defined, so every RC started event lost its start reason (RC
// tier-C finding); this locks the invariant for all events.
describe('project defaults — event attribute references are all defined', () => {
  it('every attribute referenced by defaultEvents exists in defaultAttributes as an Event attribute', () => {
    const defined = new Set(
      defaultAttributes.filter((a) => a.bizType === AttributeBizTypes.Event).map((a) => a.codeName),
    );
    const missing = defaultEvents.flatMap((e) =>
      e.attributes.filter((code) => !defined.has(code)).map((code) => `${e.codeName} → ${code}`),
    );
    expect(missing).toEqual([]);
  });

  it('the reason-attribute regressions stay fixed (RC + launcher)', () => {
    // Every reason attribute a session event writes must be defined AND listed on
    // its event — the same class of gap hit RC start-reason, announcement seen,
    // and launcher start/end reasons.
    const definedEvent = new Set(
      defaultAttributes.filter((a) => a.bizType === AttributeBizTypes.Event).map((a) => a.codeName),
    );
    const eventLists = new Map(
      defaultEvents.map((e) => [e.codeName as string, new Set(e.attributes as string[])]),
    );
    const cases: [string, string][] = [
      ['resource_center_started', EventAttributes.RESOURCE_CENTER_START_REASON],
      ['launcher_seen', EventAttributes.LAUNCHER_START_REASON],
      ['launcher_dismissed', EventAttributes.LAUNCHER_END_REASON],
    ];
    for (const [event, attr] of cases) {
      expect(definedEvent.has(attr)).toBe(true); // attribute row exists
      expect(eventLists.get(event)?.has(attr)).toBe(true); // linked to its event
    }
  });
});
