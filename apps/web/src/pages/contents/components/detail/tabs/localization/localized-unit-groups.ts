import type { LocalizationTranslationUnit } from '@usertour/helpers';

/**
 * How the page stacks units: consecutive units under the container they
 * belong to (a checklist task, a resource-center block), and inside that
 * under the element they belong to. Both are runs in walk order, never a
 * regrouping — the walkers already emit a container's units together.
 */

export interface UnitGroup {
  key: string;
  element: LocalizationTranslationUnit['element'];
  units: LocalizationTranslationUnit[];
}

export interface UnitContainer {
  key: string;
  group: LocalizationTranslationUnit['group'];
  units: LocalizationTranslationUnit[];
}

/** Consecutive units sharing a key, in walk order. */
const groupConsecutive = <T>(
  units: LocalizationTranslationUnit[],
  keyOf: (unit: LocalizationTranslationUnit) => string,
  make: (unit: LocalizationTranslationUnit, key: string) => T,
  unitsOf: (group: T) => LocalizationTranslationUnit[],
  keyOfGroup: (group: T) => string,
): T[] => {
  const groups: T[] = [];
  for (const unit of units) {
    const key = keyOf(unit);
    const last = groups[groups.length - 1];
    if (last && keyOfGroup(last) === key) {
      unitsOf(last).push(unit);
    } else {
      groups.push(make(unit, key));
    }
  }
  return groups;
};

/** A unit without an element stands alone (its own row, no section header). */
export const groupUnitsByElement = (units: LocalizationTranslationUnit[]): UnitGroup[] => {
  return groupConsecutive(
    units,
    (unit) => unit.element?.path ?? `unit:${unit.path}`,
    (unit, key) => ({ key, element: unit.element, units: [unit] }),
    (group) => group.units,
    (group) => group.key,
  );
};

/**
 * Units outside any container run together as ONE stretch, so the element
 * grouping inside it stays intact — a container per unit would split an
 * element's rows under repeated headers.
 */
export const groupUnitsByContainer = (units: LocalizationTranslationUnit[]): UnitContainer[] => {
  return groupConsecutive(
    units,
    (unit) => unit.group?.path ?? 'ungrouped',
    (unit, key) => ({ key, group: unit.group, units: [unit] }),
    (container) => container.units,
    (container) => container.key,
  );
};
