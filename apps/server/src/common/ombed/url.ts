const parseUrl = (url: string) => {
  const urlPatterns = url.match(
    /^(([a-z\d]+):\/\/)?([^/?#]+)?(\/[^?#]*)?(\?([^#]*))?(#.*)?$/i
  );
  if (!urlPatterns) {
    return null;
  }
  const [, , scheme = "", domain = "", path = "", , query = "", fragment = ""] =
    urlPatterns;
  return { scheme, domain, path, query, fragment };
};

const replaceWildcard = (str: string, s1: string, s2?: string) => {
  str = replaceSpecialWords(str);
  str = str.replace(/\\\*/g, s1 + "*");
  if (s2) {
    str = str.replace(/:[a-z0-9_]+/g, "[^" + s2 + "]+");
  }
  return str;
};

const replaceSpecialWords = (str: string) => {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const parsePattern = (pattern: string) => {
  if (!pattern || !pattern.trim()) {
    return null;
  }
  const _pattern = parseUrl(pattern);
  if (!_pattern) {
    console.error("Invalid URL pattern:", pattern);
    return null;
  }
  const { scheme, domain, path, query, fragment } = _pattern;
  const _scheme = scheme ? replaceSpecialWords(scheme) : "[a-z\\d]+";
  const _domain = domain ? replaceWildcard(domain, "[^/]", ".") : "[^/]*";
  const _fragment = fragment ? replaceWildcard(fragment, ".", "/") : "(#.*)?";
  const _path = path ? replaceWildcard(path, "[^?#]", "/") : "/[^?#]*";
  let _query = "(\\?[^#]*)?";
  if (query) {
    new URLSearchParams(query).forEach((key, value) => {
      let _str;
      (_str =
        "" === key
          ? "=?"
          : "*" === key
          ? "(=[^&#]*)?"
          : "=" + replaceWildcard(key, "[^#]")),
        (_query +=
          "(?=.*[?&]" + replaceSpecialWords(value) + _str + "([&#]|$))");
    });
    _query += "\\?[^#]*";
  }
  return new RegExp(
    "^" +
      _scheme +
      "://" +
      _domain +
      "(:\\d+)?" +
      _path +
      _query +
      _fragment +
      "$"
  );
};

export const isMatchUrlPattern = (
  _url: string,
  includes: string[],
  excludes: string[]
) => {
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
