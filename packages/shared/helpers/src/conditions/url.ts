import { RulesCondition } from '@usertour/types';
import { matchUrlPattern } from './url-v2';

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

export const isMatchUrlPattern = (_url: string, includes: string[], excludes: string[]) => {
  const isMatchIncludesConditions =
    includes.length > 0
      ? includes.some((_include) => {
          const reg = parsePattern(_include);
          if (reg) {
            return reg.test(_url);
          }
          return false;
        })
      : true;
  const isMatchExcludesConditions =
    excludes.length > 0
      ? excludes.some((_exclude) => {
          const reg = parsePattern(_exclude);
          if (reg) {
            return reg.test(_url);
          }
          return false;
        })
      : false;
  return isMatchIncludesConditions && !isMatchExcludesConditions;
};

export const evaluateUrlCondition = (rules: RulesCondition, url: string) => {
  const { excludes = [], includes = [] } = rules.data || {};
  return matchUrlPattern({ includes, excludes }, url);
};
