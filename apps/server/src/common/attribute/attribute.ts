import { BizAttributeTypes } from "../consts/attribute";

export const isNull = function (x: unknown): x is null {
  // eslint-disable-next-line posthog-js/no-direct-null-check
  return x === null;
};

function isDateValid(dateStr: string): boolean {
  if (!isNaN(Number(dateStr))) {
    return false;
  }
  if (dateStr.length < 10) {
    return false;
  }

  return !isNaN(Date.parse(dateStr));
}

export const getAttributeType = (attribute: any): number => {
  const t = typeof attribute;
  if (t == "number") {
    return BizAttributeTypes.Number;
  } else if (t == "string") {
    if (isDateValid(attribute)) {
      return BizAttributeTypes.DateTime;
    }
    return BizAttributeTypes.String;
  } else if (t == "boolean") {
    return BizAttributeTypes.Boolean;
  } else if (t == "object" && Array.isArray(attribute)) {
    return BizAttributeTypes.List;
  }
  return BizAttributeTypes.Nil;
};

export const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const filterNullAttributes = (attributes: any) => {
  let attrs = {};
  for (const key in attributes) {
    const v = attributes[key];
    if (!isNull(v)) {
      attrs[key] = v;
    }
  }
  return attrs;
};
