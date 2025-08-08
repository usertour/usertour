import { finder as finderLib } from '@medv/finder';

export type Options = {
  root: Element;
  idName: (name: string) => boolean;
  className: (name: string) => boolean;
  tagName: (name: string) => boolean;
  attr: (name: string, value: string) => boolean;
  seedMinLength: number;
  optimizedMinLength: number;
  threshold: number;
  maxNumberOfTries: number;
};

export type XNode = {
  //selectors list order : mix,idname,className,tagName
  selectors: string[];
  nextElementSelectors: string[];
  previousElementSelectors: string[];
  depth: number;
  parentNode?: XNode | null;
};

export type XData = {
  node: XNode;
};

export type XResult = {
  maxDepth: number;
  failedDepth: number;
  success: boolean;
};

export type Target = {
  selectors?: any;
  content?: string;
  sequence?: string;
  precision?: string;
  isDynamicContent?: boolean;
  customSelector?: string;
  type?: string;
};

const finderAttrs = [
  'data-for',
  'data-id',
  'data-testid',
  'data-test-id',
  'for',
  'id',
  'name',
  'placeholder',
  'role',
];

const defaultConfig = {
  idName: () => false,
  className: () => false,
  tagName: () => false,
  attr: () => false,
  seedMinLength: 1,
  optimizedMinLength: 2,
  threshold: 1000,
  maxNumberOfTries: 10_000,
};

const finderConfigs = [
  {
    ...defaultConfig,
    tagName: () => true,
  },
  {
    ...defaultConfig,
    idName: () => true,
  },
  {
    ...defaultConfig,
    tagName: () => true,
    attr: (name: string) => finderAttrs.includes(name),
  },
  {
    ...defaultConfig,
    className: () => true,
    attr: (name: string) => finderAttrs.includes(name),
  },
  {
    ...defaultConfig,
    tagName: () => true,
    idName: () => true,
    className: () => true,
    attr: () => false,
  },
  {
    ...defaultConfig,
    tagName: () => true,
    idName: () => true,
    className: () => true,
    attr: (name: string) => finderAttrs.includes(name),
  },
];

// finderAttrs.forEach((attr) => {
//   finderConfigs.push({
//     ...defaultConfig,
//     tagName: (name: string) => true,
//     attr: (name: string, value) => name == attr,
//   });
// });

function getMaxDepth(node: XNode): number {
  if (node.parentNode) {
    return getMaxDepth(node.parentNode);
  }
  return node.depth;
}

function queryNodeListBySelectors(
  selectors: string[],
  rootDocument: Element | Document,
  removeRepeat = true,
): Element[] {
  const nodes: Element[] = [];
  if (!selectors) {
    return nodes;
  }
  for (const s of selectors) {
    const els = rootDocument.querySelectorAll(s.replace(/\\\\/g, '\\'));
    if (els && els.length > 0) {
      nodes.push(...Array.from(els));
    }
  }
  return removeRepeat ? [...new Set(nodes)] : nodes;
}

function findMostRecurringNode(nodes: Element[]): Element {
  const m = new Map();
  let finalNode: Element = nodes[0];
  let count = 0;
  for (const node of nodes) {
    const i = m.get(node) ? m.get(node) + 1 : 1;
    m.set(node, i);
  }

  m.forEach((value, key) => {
    if (value > count) {
      count = value;
      finalNode = key;
    }
  });
  return finalNode;
}

function compareParentNode(
  node: XNode,
  el: Element,
  rootDocument: Element | Document,
  isCompareSibings = false,
): XResult {
  let nodeParentNode = node.parentNode;
  let elParentElement = el.parentElement;
  const maxDepth = getMaxDepth(node);
  const xresult: XResult = {
    maxDepth,
    failedDepth: 0,
    success: true,
  };
  while (nodeParentNode && elParentElement) {
    if (elParentElement === rootDocument) {
      break;
    }
    if (
      elParentElement === document.body ||
      elParentElement === document.documentElement ||
      elParentElement.parentElement === document.body
    ) {
      break;
    }
    const parentNodes = queryNodeListBySelectors(nodeParentNode.selectors, rootDocument);
    const isMatchSibings = isCompareSibings
      ? compareSibingsNode(nodeParentNode, elParentElement, rootDocument)
      : true;

    if (
      !parentNodes ||
      parentNodes.length === 0 ||
      !parentNodes.includes(elParentElement) ||
      !isMatchSibings
    ) {
      xresult.failedDepth = nodeParentNode.depth;
      xresult.success = false;
    }
    nodeParentNode = nodeParentNode.parentNode;
    elParentElement = elParentElement.parentElement;
  }
  return xresult;
}

function compareSibingsNode(node: XNode, el: Element, rootDocument: Element | Document) {
  let isMatchNext = true;
  let isMatchPrevious = true;
  const { previousElementSelectors, nextElementSelectors } = node;
  if (nextElementSelectors && nextElementSelectors.length > 0) {
    const nextElementSiblings = queryNodeListBySelectors(nextElementSelectors, rootDocument);
    isMatchNext = (el.nextElementSibling &&
      nextElementSiblings.includes(el.nextElementSibling)) as boolean;
  }
  if (previousElementSelectors && previousElementSelectors.length > 0) {
    const previousElementSiblings = queryNodeListBySelectors(
      previousElementSelectors,
      rootDocument,
    );
    isMatchPrevious = (el.previousElementSibling &&
      previousElementSiblings.includes(el.previousElementSibling)) as boolean;
  }
  return isMatchNext && isMatchPrevious;
}

function queryElementSelectors(input: Element) {
  const classes = Array.from(input.classList);
  const selectors: string[] = [];
  const configs: any[] = [...finderConfigs];
  for (const className of classes) {
    configs.push({
      ...defaultConfig,
      className: (name: string) => {
        if (classes.filter((cn) => cn !== className).includes(name)) {
          return false;
        }
        return true;
      },
    });
  }
  try {
    for (const cfg of configs) {
      selectors.push(finder(input, cfg));
    }
  } catch (_) {
    return selectors;
  }
  return [...new Set(selectors)];
}

function parseSelectorsTree(input: Element, parentNode: XNode | null, depth = 0): XNode | null {
  const selectors = queryElementSelectors(input);
  if (selectors.length === 0) {
    return parentNode;
  }

  const currentNode: XNode = {
    previousElementSelectors: [],
    nextElementSelectors: [],
    selectors,
    depth,
  };

  if (input.previousElementSibling) {
    currentNode.previousElementSelectors = queryElementSelectors(input.previousElementSibling);
  }
  if (input.nextElementSibling) {
    currentNode.nextElementSelectors = queryElementSelectors(input.nextElementSibling);
  }

  if (parentNode === null) {
    if (input.parentElement) {
      parseSelectorsTree(input.parentElement, currentNode, depth + 1);
    }
    return currentNode;
  }

  parentNode.parentNode = currentNode;
  if (input.parentElement) {
    parseSelectorsTree(input.parentElement, currentNode, depth + 1);
  }
  return parentNode;
}

function finderMostPrecisionElement(
  elements: Element[],
  node: XNode,
  rootDocument: Element | Document,
  precision: number,
): Element | null {
  const successEls = [];
  let failedData = {
    el: null as Element | null,
    failedDepth: 0 as number,
    maxDepth: 0 as number,
  };
  for (const el of elements) {
    const { success, failedDepth, maxDepth } = compareParentNode(node, el, rootDocument);
    if (success) {
      successEls.push(el);
    } else if (!failedData.el || failedDepth > failedData.failedDepth) {
      failedData = { el, failedDepth, maxDepth };
    }
  }
  if (successEls.length === 1) {
    return successEls[0];
  }
  if (successEls.length > 1) {
    //need double check el siblings element
    let tempEl: Element = successEls[0];
    let tempFailedDepth = 0;
    for (const el of successEls) {
      const { success, failedDepth } = compareParentNode(node, el, rootDocument, true);
      if (success) {
        return el;
      }
      if (failedDepth > tempFailedDepth) {
        tempFailedDepth = failedDepth;
        tempEl = el;
      }
    }
    return tempEl;
  }
  if (failedData.el) {
    const { failedDepth, maxDepth, el } = failedData;
    const rate = ((failedDepth - 1) / maxDepth) * 10;
    if (rate >= precision) {
      return el;
    }
  }
  return null;
}

export function finder(input: Element, options?: Partial<Options>) {
  return finderLib(input, options);
}

export function parserX(input: Element): XNode | null {
  return parseSelectorsTree(input, null);
}

export type TargetResult = {
  content: string;
  selectors: XNode | null;
  selectorsList: string[];
};
export function parserV2(element: HTMLElement): TargetResult {
  const content = element.innerText ?? '';
  const selectors = parseSelectorsTree(element, null);
  const selectorsList = queryElementSelectors(element);
  return { content, selectors, selectorsList };
}

export function finderV2(target: Target, root: Element | Document) {
  const {
    selectors,
    content = '',
    sequence = 0,
    precision = 'strict',
    isDynamicContent = false,
    customSelector = '',
    type = 'auto',
  } = target;
  if (type === 'auto') {
    const mapping: any = {
      looser: 1,
      loose: 3,
      loosest: 5,
      strict: 7,
      stricter: 8,
      strictest: 10,
    };
    const el = finderX(selectors, root, mapping[precision]) as HTMLElement;
    if (el) {
      if (isDynamicContent && content && el.innerText !== content) {
        return null;
      }
      return el;
    }
  } else {
    const sequenceMapping: any = {
      '1st': 0,
      '2st': 1,
      '3st': 2,
      '4st': 3,
      '5st': 4,
    };
    if (customSelector) {
      const selector = customSelector.replace(/\\\\/g, '\\');
      const els = root.querySelectorAll(selector);
      if (els.length > 0) {
        const el = (els[sequenceMapping[sequence]] as HTMLElement) || els[0];
        if (content && el.innerText.trim() !== content) {
          return null;
        }
        return el;
      }
    }
  }
  return null;
}

export function finderX(node: XNode, root: Element | Document, precision = 10) {
  if (!node || node.selectors.length === 0) {
    return null;
  }
  const rootDocument = root || document;
  const elements: Element[] = [];
  const nodeList = queryNodeListBySelectors(node.selectors, rootDocument, false);
  if (!nodeList || nodeList.length === 0) {
    return null;
  }
  if ([...new Set(nodeList)].length !== nodeList.length) {
    const el = findMostRecurringNode(nodeList);
    elements.push(el);
  } else {
    elements.push(...nodeList);
  }

  return finderMostPrecisionElement(elements, node, rootDocument, precision);
}
