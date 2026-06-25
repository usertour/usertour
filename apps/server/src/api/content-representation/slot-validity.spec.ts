import {
  eventWhereCondition,
  representationBlock,
  representationCondition,
} from './representation.schema';
import { representationChecklist, representationLauncher } from './version-data.schema';

// These guard the "the builder restricts by slot, but the API must too" class of
// bug: condition types that are only meaningful in one place must be rejected
// everywhere else, and numeric inputs the builder bounds must be bounded here.

describe('positional condition validity', () => {
  const eventAttr = {
    type: 'event_attribute',
    attribute: 'price',
    op: 'gt',
    value: '10',
  };

  it('rejects event_attribute in a general condition slot', () => {
    expect(representationCondition.safeParse(eventAttr).success).toBe(false);
  });

  it('rejects task_clicked in a general condition slot', () => {
    expect(representationCondition.safeParse({ type: 'task_clicked' }).success).toBe(false);
  });

  it('allows event_attribute (and groups of it) inside event.where', () => {
    expect(eventWhereCondition.safeParse(eventAttr).success).toBe(true);
    expect(
      eventWhereCondition.safeParse({ type: 'group', match: 'all', conditions: [eventAttr] })
        .success,
    ).toBe(true);
  });

  it('rejects a general condition (user_attribute) inside event.where', () => {
    expect(
      eventWhereCondition.safeParse({
        type: 'user_attribute',
        attribute: 'plan',
        op: 'is',
        value: 'pro',
      }).success,
    ).toBe(false);
  });

  it('accepts an event condition carrying an event_attribute where', () => {
    expect(
      representationCondition.safeParse({ type: 'event', event: 'purchase', where: [eventAttr] })
        .success,
    ).toBe(true);
  });

  it('allows task_clicked in checklist completeWhen but not event_attribute', () => {
    expect(
      representationChecklist.safeParse({
        items: [{ name: 'A', completeWhen: [{ type: 'task_clicked' }] }],
      }).success,
    ).toBe(true);
    expect(
      representationChecklist.safeParse({ items: [{ name: 'A', completeWhen: [eventAttr] }] })
        .success,
    ).toBe(false);
  });

  it('allows task_clicked nested in an OR group within completeWhen', () => {
    // The builder lets a task complete on "clicked OR <other>", so task_clicked
    // must be valid inside a completeWhen group, not just at the top level.
    expect(
      representationChecklist.safeParse({
        items: [
          {
            name: 'A',
            completeWhen: [
              {
                type: 'group',
                match: 'any',
                conditions: [{ type: 'task_clicked' }, { type: 'current_url', includes: ['/x'] }],
              },
            ],
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('numeric range sanity', () => {
  const image = (extra: Record<string, unknown>) => ({
    type: 'image',
    url: 'https://example.com/y.png',
    ...extra,
  });

  it('rejects a negative width value (invalid CSS)', () => {
    expect(
      representationBlock.safeParse(image({ width: { unit: 'pixels', value: -10 } })).success,
    ).toBe(false);
  });

  it('accepts a percent width over 100 (valid CSS overflow; builder-only clamp)', () => {
    expect(
      representationBlock.safeParse(image({ width: { unit: 'percent', value: 150 } })).success,
    ).toBe(true);
  });

  it('accepts a normal percent width', () => {
    expect(
      representationBlock.safeParse(image({ width: { unit: 'percent', value: 80 } })).success,
    ).toBe(true);
  });

  it('accepts a negative margin (valid CSS; the builder allows it)', () => {
    expect(
      representationBlock.safeParse(image({ margin: { enabled: true, top: -8 } })).success,
    ).toBe(true);
  });

  it('requires zIndex to be an integer (negatives allowed)', () => {
    expect(representationLauncher.safeParse({ zIndex: 1.5 }).success).toBe(false);
    expect(representationLauncher.safeParse({ zIndex: -3 }).success).toBe(true);
  });
});
