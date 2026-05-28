import { type Attribute, AttributeBizTypes, type AttributeDataType } from '@usertour/types';
import { useMemo } from 'react';

export interface DerivedAttribute {
  name: string;
  value: unknown;
  dataType: AttributeDataType;
  predefined: boolean;
}

// Project an entity row's `data` blob into the displayable {name, value,
// dataType} list shown in the detail page's right-column attributes card.
// Filters by `bizType` so a User detail page doesn't accidentally surface
// Membership attributes; sorts alphabetically by display name.
//
// Replaces the `useState + useEffect` pattern that lived in
// user-detail-content / company-detail-content — pure derivation belongs
// in `useMemo`, not in state synced via effect.
export const useDerivedEntityAttributes = (
  entityData: Record<string, unknown> | null | undefined,
  attributeList: Attribute[] | undefined,
  bizType: AttributeBizTypes,
): DerivedAttribute[] => {
  return useMemo(() => {
    if (!entityData || !attributeList) return [];
    const result: DerivedAttribute[] = [];
    for (const key in entityData) {
      const attr = attributeList.find((a) => a.bizType === bizType && a.codeName === key);
      if (attr) {
        result.push({
          name: attr.displayName || attr.codeName,
          value: entityData[key],
          dataType: attr.dataType,
          predefined: attr.predefined,
        });
      }
    }
    result.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
    return result;
  }, [entityData, attributeList, bizType]);
};
