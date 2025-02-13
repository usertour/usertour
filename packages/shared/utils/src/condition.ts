import { RulesCondition } from '@usertour-ui/types';
import isEqual from 'fast-deep-equal';

const parseUrl = (url: string) => {
  const urlPatterns = url.match(/^(([a-z\d]+):\/\/)?([^/?#]+)?(\/[^?#]*)?(\?([^#]*))?(#.*)?$/i);
  if (!urlPatterns) {
    return null;
  }
  const [, , scheme = '', domain = '', path = '', , query = '', fragment = ''] = urlPatterns;
  return { scheme, domain, path, query, fragment };
};

const replaceWildcard = (input: string, s1: string, s2?: string) => {
  const withSpecialWords = replaceSpecialWords(input);
  const withWildcard = withSpecialWords.replace(/\\\*/g, `${s1}*`);
  if (!s2) {
    return withWildcard;
  }
  return withWildcard.replace(/:[a-z0-9_]+/g, `[^${s2}]+`);
};

const replaceSpecialWords = (str: string) => {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const parsePattern = (pattern: string) => {
  if (!pattern || !pattern.trim()) {
    return null;
  }
  const _pattern = parseUrl(pattern);
  if (!_pattern) {
    console.error('Invalid URL pattern:', pattern);
    return null;
  }
  const { scheme, domain, path, query, fragment } = _pattern;
  const _scheme = scheme ? replaceSpecialWords(scheme) : '[a-z\\d]+';
  const _domain = domain ? replaceWildcard(domain, '[^/]', '.') : '[^/]*';
  const _fragment = fragment ? replaceWildcard(fragment, '.', '/') : '(#.*)?';
  const _path = path ? replaceWildcard(path, '[^?#]', '/') : '/[^?#]*';
  let _query = '(\\?[^#]*)?';
  if (query) {
    new URLSearchParams(query).forEach((value: string, key: string) => {
      const _str =
        value === '' ? '=?' : value === '*' ? '(=[^&#]*)?' : `=${replaceWildcard(value, '[^#]')}`;
      _query += `(?=.*[?&]${replaceSpecialWords(key)}${_str}([&#]|$))`;
    });
    _query += '\\?[^#]*';
  }
  return new RegExp(`^${_scheme}://${_domain}(:\\d+)?${_path}${_query}${_fragment}$`);
};

const isMatchUrlPattern = (_url: string, includes: string[], excludes: string[]) => {
  // const _url = window.location.href;
  const isMatchIncludesConditions = includes
    ? includes.some((_include) => {
        const reg = parsePattern(_include);
        if (reg) {
          return _url.match(reg);
        }
        return false;
      })
    : false;
  const isMatchExcludesConditions = excludes
    ? excludes.some((_exclude) => {
        const reg = parsePattern(_exclude);
        if (reg) {
          return _url.match(reg);
        }
        return false;
      })
    : false;
  return isMatchIncludesConditions && !isMatchExcludesConditions;
};

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

export { isEqual, conditionsIsSame, isMatchUrlPattern };
