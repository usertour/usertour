import { RulesCondition } from '@usertour/types';
import isEqual from 'fast-deep-equal';

const compareConditionsItem = (item1: RulesCondition, item2: RulesCondition) => {
  const { data = {}, ...others1 } = item1;
  const { data: data2 = {}, ...others2 } = item2;
  if (!isEqual(others2, others1)) {
    return false;
  }
  for (const key in data) {
    if (!isEqual(data[key], data2[key])) {
      return false;
    }
  }
  return true;
};

const conditionsIsSame = (rr1: RulesCondition[], rr2: RulesCondition[]) => {
  const r1 = [...rr1];
  const r2 = [...rr2];
  if (r1.length === 0 && r2.length === 0) {
    return true;
  }
  if (r1.length !== r2.length) {
    return false;
  }
  const group1 = r1.filter((item) => item.type === 'group');
  const group2 = r2.filter((item) => item.type === 'group');
  if (group1.length !== group2.length) {
    return false;
  }
  for (let index = 0; index < r1.length; index++) {
    const item1 = r1[index];
    const item2 = r2[index];
    if (!item1 || !item2) {
      return false;
    }
    if (item1.type === 'group') {
      if (!item2.conditions) {
        return false;
      }
      const c1 = item1.conditions as RulesCondition[];
      const c2 = item2.conditions as RulesCondition[];
      if (item1.operators !== item2.operators) {
        return false;
      }
      if (!conditionsIsSame(c1, c2)) {
        return false;
      }
    } else {
      if (!compareConditionsItem(item1, item2)) {
        return false;
      }
    }
  }
  return true;
};

export { isEqual, conditionsIsSame };
