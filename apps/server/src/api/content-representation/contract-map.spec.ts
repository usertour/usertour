import { CONTENT_TYPE_TRAITS } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';

import {
  CONTENT_REFERENCE_TARGET_TYPE_SET,
  REACTIVE_REJECTED_REP_CONDITION_TYPES,
  REP_CONDITION_TYPE_TO_INTERNAL,
  contentActionCapabilities,
  dismissVariantFor,
  stepCapabilities,
} from './contract-map';

/**
 * Locks the capability-matrix → guard derivations. The write guards no longer
 * hand-copy their sets; these assertions pin what the derivations must produce,
 * so a matrix or name-map edit that would silently change enforcement fails here
 * first.
 */
describe('contract-map (capability matrix derivations)', () => {
  it('rejects exactly the server-evaluated condition types in reactive slots', () => {
    expect([...REACTIVE_REJECTED_REP_CONDITION_TYPES].sort()).toEqual([
      'content_state',
      'event',
      'segment',
    ]);
  });

  it('maps every general representation condition type to an internal type', () => {
    // The general condition vocabulary (representation.schema RepresentationCondition),
    // minus `unsupported` (round-trip passthrough, no internal counterpart).
    const GENERAL_REP_CONDITION_TYPES = [
      'group',
      'attribute',
      'segment',
      'current_url',
      'element',
      'content_state',
      'event',
      'text_input',
      'text_filled',
      'time_window',
    ];
    expect(Object.keys(REP_CONDITION_TYPE_TO_INTERNAL).sort()).toEqual(
      [...GENERAL_REP_CONDITION_TYPES].sort(),
    );
  });

  it('allows goto_step only in flows', () => {
    const allTypes = Object.values(ContentDataType);
    const allowing = allTypes.filter((t) =>
      contentActionCapabilities(t)?.actions.some((a) => a === 'step-goto'),
    );
    expect(allowing).toEqual([ContentDataType.FLOW]);
  });

  it('gives every dismissable type its host-specific variant', () => {
    expect(dismissVariantFor(ContentDataType.FLOW)).toBe('flow-dismis');
    expect(dismissVariantFor(ContentDataType.CHECKLIST)).toBe('checklist-dismis');
    expect(dismissVariantFor(ContentDataType.LAUNCHER)).toBe('launcher-dismis');
    expect(dismissVariantFor(ContentDataType.BANNER)).toBe('banner-dismis');
  });

  it('leaves resource-center, announcement (action slots, no dismiss) and tracker (no slots) without a dismiss', () => {
    const rc = contentActionCapabilities(ContentDataType.RESOURCE_CENTER);
    expect(rc?.dismissVariant).toBeNull();
    expect(rc?.actions.length).toBeGreaterThan(0);
    // Announcement: feed entries are marked seen, never dismissed — the scan
    // found this row asserted nowhere (the one dismiss-variant with no pin).
    const announcement = contentActionCapabilities(ContentDataType.ANNOUNCEMENT);
    expect(announcement?.dismissVariant).toBeNull();
    expect(announcement?.actions.length).toBeGreaterThan(0);
    const tracker = contentActionCapabilities(ContentDataType.TRACKER);
    expect(tracker?.dismissVariant).toBeNull();
    expect(tracker?.actions).toEqual([]);
  });

  it('pins the per-type traits table — edits here must be deliberate', () => {
    // These traits replaced hand-maintained type sets in usable.validate
    // (UI_TYPES, AUTO_START_REQUIRED_TYPES) and content-versions.service
    // (scheduledAt gate, dead-content exemption). Changing a value changes
    // validator/service behavior — this pin makes that a conscious act.
    const trait = <K extends keyof (typeof CONTENT_TYPE_TRAITS)[ContentDataType.FLOW]>(k: K) =>
      Object.entries(CONTENT_TYPE_TRAITS)
        .filter(([, t]) => t[k])
        .map(([type]) => type)
        .sort();
    expect(trait('requiresTheme')).toEqual([
      'announcement',
      'banner',
      'checklist',
      'flow',
      'launcher',
      'resource-center',
    ]);
    expect(trait('autoStartRequiredToAppear')).toEqual(['banner', 'launcher', 'resource-center']);
    expect(trait('startsOnDemand')).toEqual(['checklist', 'flow']);
    expect(trait('allowsScheduledAt')).toEqual(['announcement']);
  });

  it('limits cross-content references to flow and checklist', () => {
    expect([...CONTENT_REFERENCE_TARGET_TYPE_SET].sort()).toEqual(['checklist', 'flow']);
  });

  it('shapes steps per kind: tooltip anchors (and alone takes onClick), modal uses the grid', () => {
    expect(stepCapabilities('tooltip')).toEqual({
      placement: 'anchor',
      onClick: true,
      requiresTarget: true,
    });
    expect(stepCapabilities('modal')).toMatchObject({ placement: 'grid', onClick: false });
    expect(stepCapabilities('bubble')).toMatchObject({ placement: 'theme', onClick: false });
    expect(stepCapabilities('hidden')).toMatchObject({ placement: 'none', onClick: false });
    expect(stepCapabilities('nope')).toBeUndefined();
  });
});
