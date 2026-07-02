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
    expect([...REACTIVE_REJECTED_REP_CONDITION_TYPES].sort()).toEqual(['event', 'flow', 'segment']);
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
      'flow',
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

  it('leaves resource-center (has action slots) and tracker (has none) without a dismiss', () => {
    const rc = contentActionCapabilities(ContentDataType.RESOURCE_CENTER);
    expect(rc?.dismissVariant).toBeNull();
    expect(rc?.actions.length).toBeGreaterThan(0);
    const tracker = contentActionCapabilities(ContentDataType.TRACKER);
    expect(tracker?.dismissVariant).toBeNull();
    expect(tracker?.actions).toEqual([]);
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
