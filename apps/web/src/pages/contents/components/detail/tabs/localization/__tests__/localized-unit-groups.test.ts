import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { ContentEditorElementType } from '@usertour/types';

import { groupUnitsByContainer, groupUnitsByElement } from '../localized-unit-groups';

const unit = (
  path: string,
  extra: Partial<LocalizationTranslationUnit> = {},
): LocalizationTranslationUnit => ({
  path,
  sourceText: path,
  translatedText: '',
  kind: 'text',
  field: 'text',
  ...extra,
});

const text = { path: '0.0.0', type: ContentEditorElementType.TEXT };
const button = { path: '0.0.1', type: ContentEditorElementType.BUTTON };

describe('groupUnitsByElement', () => {
  it("keeps an element's consecutive units under one section", () => {
    const groups = groupUnitsByElement([
      unit('0.0.0:text.0.0', { element: text }),
      unit('0.0.0:text.0.1:fallback', { element: text, field: 'fallback' }),
      unit('0.0.1:button.text', { element: button, field: 'button.text' }),
      unit('0.0.1:button.actions.0:navigate.url', {
        element: button,
        field: 'navigate.url',
        kind: 'destination',
      }),
    ]);
    expect(groups.map((group) => [group.element?.type, group.units.length])).toEqual([
      [ContentEditorElementType.TEXT, 2],
      [ContentEditorElementType.BUTTON, 2],
    ]);
  });

  it('gives an element-less unit its own headerless group', () => {
    const groups = groupUnitsByElement([unit('buttonText'), unit('headerText')]);
    expect(groups.map((group) => [group.element, group.units.length])).toEqual([
      [undefined, 1],
      [undefined, 1],
    ]);
  });
});

describe('groupUnitsByContainer', () => {
  it('runs container-less units together so their element sections survive', () => {
    // The banner case: no containers at all — one stretch, two element sections.
    const containers = groupUnitsByContainer([
      unit('contents/0.0.0:text.0.0', { element: text }),
      unit('contents/0.0.0:text.0.1:fallback', { element: text, field: 'fallback' }),
      unit('contents/0.0.1:button.text', { element: button, field: 'button.text' }),
    ]);
    expect(containers).toHaveLength(1);
    expect(containers[0].group).toBeUndefined();
    expect(groupUnitsByElement(containers[0].units)).toHaveLength(2);
  });

  it('opens a container per task / block, in walk order, and closes it when the run ends', () => {
    const invite = { path: 'items.item-1', title: 'Invite your team' };
    const create = { path: 'items.item-2', title: 'Create a flow' };
    const containers = groupUnitsByContainer([
      unit('buttonText'),
      unit('items.item-1:name', { group: invite, field: 'item.name' }),
      unit('items.item-1:clickedActions.0:navigate.url', {
        group: invite,
        field: 'navigate.url',
        kind: 'destination',
      }),
      unit('items.item-2:name', { group: create, field: 'item.name' }),
    ]);
    expect(containers.map((container) => [container.group?.title, container.units.length])).toEqual(
      [
        [undefined, 1],
        ['Invite your team', 2],
        ['Create a flow', 1],
      ],
    );
  });
});
