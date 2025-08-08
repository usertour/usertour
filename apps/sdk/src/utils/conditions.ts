import { computePosition, hide } from '@floating-ui/dom';
import { finderV2 } from '@usertour-packages/finder';
import { isMatchUrlPattern, isActiveRulesByCurrentTime } from '@usertour/helpers';
import {
  RulesCondition,
  ElementConditionLogic,
  StringConditionLogic,
  ContentPriority,
  RulesType,
} from '@usertour/types';
import { document, location } from '../utils/globals';
import { off, on } from './listener';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

export const rulesTypes: RulesType[] = Object.values(RulesType);

const isActiveRulesByCurrentPage = (rules: RulesCondition) => {
  const { excludes, includes } = rules.data;
  if (location) {
    const href = location.href;
    return isMatchUrlPattern(href, includes, excludes);
  }
  return false;
};

export const isVisible = async (el: HTMLElement) => {
  if (!document?.body) {
    return false;
  }
  const { middlewareData } = await computePosition(el, document.body, {
    strategy: 'fixed',
    middleware: [hide()],
  });
  if (middlewareData?.hide?.referenceHidden) {
    return false;
  }
  return true;
};

const cache = new Map();

const isClicked = (el: HTMLElement) => {
  if (cache.has(el)) {
    return cache.get(el);
  }
  const onClick = () => {
    cache.set(el, true);
    off(el, 'click', onClick);
  };
  on(el, 'click', onClick);
  cache.set(el, false);
  return false;
};

const isActiveRulesByElement = async (rules: RulesCondition) => {
  const { data } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(data.elementData, document);

  const isPresent = el ? await isVisible(el) : false;
  const isDisabled = el ? (el as any).disabled : false;
  switch (data.logic) {
    case ElementConditionLogic.PRESENT:
      return isPresent;
    case ElementConditionLogic.UNPRESENT:
      return !isPresent;
    case ElementConditionLogic.DISABLED:
      return el && isDisabled;
    case ElementConditionLogic.UNDISABLED:
      return el && !isDisabled;
    case ElementConditionLogic.CLICKED:
      return el && isClicked(el);
    case ElementConditionLogic.UNCLICKED:
      return el && !isClicked(el);
    default:
      return false;
  }
};

const isActiveRulesByTextInput = async (rules: RulesCondition) => {
  const {
    data: { elementData, logic, value },
  } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(elementData, document) as HTMLInputElement;
  if (!el) {
    return false;
  }
  const elValue = el.value;
  switch (logic) {
    case StringConditionLogic.IS:
      return elValue === value;
    case StringConditionLogic.NOT:
      return elValue !== value;
    case StringConditionLogic.CONTAINS:
      return elValue.includes(value);
    case StringConditionLogic.NOT_CONTAIN:
      return !elValue.includes(value);
    case StringConditionLogic.STARTS_WITH:
      return elValue.startsWith(value);
    case StringConditionLogic.ENDS_WITH:
      return elValue.endsWith(value);
    case StringConditionLogic.MATCH:
      return elValue.search(value) !== -1;
    case StringConditionLogic.UNMATCH:
      return elValue.search(value) === -1;
    case StringConditionLogic.ANY:
      return true;
    case StringConditionLogic.EMPTY:
      return !elValue;
    default:
      return false;
  }
};

const fillCache = new Map();

const isActiveRulesByTextFill = async (rules: RulesCondition) => {
  const {
    data: { elementData },
  } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(elementData, document) as HTMLInputElement;
  if (!el) {
    return false;
  }
  const now = new Date().getTime();
  const onKeyup = () => {
    const cacheData = fillCache.get(el);
    const data = { ...cacheData, timestamp: new Date().getTime() };
    fillCache.set(el, data);
  };
  if (fillCache.has(el)) {
    const { timestamp, value, isActive } = fillCache.get(el);
    if (isActive) {
      return true;
    }
    if (timestamp !== -1 && now - timestamp > 1000 && value !== el.value) {
      off(document, 'click', onKeyup);
      fillCache.set(el, { timestamp, value, isActive: true });
      return true;
    }
    return false;
  }
  on(document, 'keyup', onKeyup);
  fillCache.set(el, { timestamp: -1, value: el.value, isActive: false });
  return false;
};

const isValidRulesType = (type: string) => {
  return rulesTypes.includes(type as RulesType);
};

const isActiveRules = async (rules: RulesCondition) => {
  if (!isValidRulesType(rules.type)) {
    return true;
  }
  switch (rules.type) {
    case RulesType.CURRENT_PAGE:
      return isActiveRulesByCurrentPage(rules);
    case RulesType.TIME:
      return isActiveRulesByCurrentTime(rules);
    case RulesType.ELEMENT:
      return await isActiveRulesByElement(rules);
    case RulesType.TEXT_INPUT:
      return await isActiveRulesByTextInput(rules);
    case RulesType.TEXT_FILL:
      return await isActiveRulesByTextFill(rules);
    default:
      return rules.actived;
  }
};

type RewriteRulesCondition = Partial<Record<RulesType, boolean>>;

export const activedRulesConditions = async (
  conditions: RulesCondition[],
  rewrite?: RewriteRulesCondition,
) => {
  const rulesCondition: RulesCondition[] = [...conditions];
  for (let j = 0; j < rulesCondition.length; j++) {
    const rules = rulesCondition[j];
    if (rules.type !== 'group') {
      if (rewrite?.[rules.type as keyof RewriteRulesCondition]) {
        rulesCondition[j].actived = true;
      } else {
        rulesCondition[j].actived = await isActiveRules(rules);
      }
    } else if (rules.conditions) {
      rulesCondition[j].conditions = await activedRulesConditions(rules.conditions);
    }
  }
  return rulesCondition;
};
