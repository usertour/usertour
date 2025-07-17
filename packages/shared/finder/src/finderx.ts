import { finder as finderLib } from '@medv/finder';

/**
 * Enhanced element finder with support for:
 * - Iframe traversal (including nested iframes)
 * - Shadow DOM traversal (including nested shadow DOMs)
 * - Cross-origin iframe detection (with graceful fallback)
 * - Recursive document context discovery
 */

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
  // New iframe-specific properties
  iframeContext?: string; // Selector to reach the iframe containing this element
  isInIframe?: boolean;
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
  // New iframe-specific properties
  iframeContext?: string;
  searchInIframes?: boolean; // Whether to search inside iframes
};

// Legacy iframe context type (for backward compatibility)
export interface IFrameContext {
  iframe: HTMLIFrameElement | null;
  document: Document;
  selector: string; // Selector to identify this iframe
  depth: number; // Nesting depth of iframe
}

// New result type with iframe information
export type FinderResult = {
  element: HTMLElement;
  iframeContext?: string;
  isInIframe: boolean;
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

// Enhanced context type to handle both iframes and shadow DOMs
export interface DocumentContext {
  iframe: HTMLIFrameElement | null;
  shadowHost: Element | null;
  document: Document;
  selector: string; // Selector to identify this context
  depth: number; // Nesting depth
  contextType: 'main' | 'iframe' | 'shadow';
}

// Iframe and Shadow DOM detection and traversal functions
function getAllAccessibleDocuments(rootDocument: Document = document): DocumentContext[] {
  const contexts: DocumentContext[] = [];

  // Add main document
  contexts.push({
    iframe: null,
    shadowHost: null,
    document: rootDocument,
    selector: '', // Empty selector for main document
    depth: 0,
    contextType: 'main',
  });

  // Find all iframes in the document
  const iframes = rootDocument.querySelectorAll('iframe');
  console.log('iframes', iframes);

  iframes.forEach((iframe, index) => {
    try {
      // Try to access iframe content (will fail for cross-origin)
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        // Generate a selector for this iframe
        const iframeSelector = generateIframeSelector(iframe, index);

        contexts.push({
          iframe,
          shadowHost: null,
          document: iframeDoc,
          selector: iframeSelector,
          depth: 1,
          contextType: 'iframe',
        });

        // Recursively check for nested iframes and shadow DOMs
        const nestedContexts = getAllAccessibleDocuments(iframeDoc);
        for (const nestedContext of nestedContexts) {
          if (nestedContext.selector) {
            // Combine selectors for nested contexts
            nestedContext.selector = `${iframeSelector} ${nestedContext.selector}`;
            nestedContext.depth = nestedContext.depth + 1;
          } else {
            nestedContext.selector = iframeSelector;
            nestedContext.depth = 1;
          }
          if (nestedContext.iframe || nestedContext.shadowHost) {
            contexts.push(nestedContext);
          }
        }
      }
    } catch (error) {
      // Cross-origin iframe - cannot access
      console.warn(
        `Cannot access iframe ${index}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  });

  // Find all shadow DOMs in the document
  const shadowHosts = findShadowHosts(rootDocument);
  console.log('shadow hosts', shadowHosts);

  shadowHosts.forEach((host, index) => {
    try {
      const shadowRoot = host.shadowRoot;
      if (shadowRoot) {
        // Generate a selector for this shadow host
        const shadowSelector = generateShadowSelector(host, index);

        contexts.push({
          iframe: null,
          shadowHost: host,
          document: shadowRoot as unknown as Document, // ShadowRoot implements Document interface
          selector: shadowSelector,
          depth: 1,
          contextType: 'shadow',
        });

        // Recursively check for nested shadow DOMs and iframes within shadow DOM
        const nestedContexts = getAllAccessibleDocuments(shadowRoot as unknown as Document);
        for (const nestedContext of nestedContexts) {
          if (nestedContext.selector) {
            // Combine selectors for nested contexts
            nestedContext.selector = `${shadowSelector} ${nestedContext.selector}`;
            nestedContext.depth = nestedContext.depth + 1;
          } else {
            nestedContext.selector = shadowSelector;
            nestedContext.depth = 1;
          }
          if (nestedContext.iframe || nestedContext.shadowHost) {
            contexts.push(nestedContext);
          }
        }
      }
    } catch (error) {
      console.warn(
        `Cannot access shadow DOM ${index}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  });

  return contexts;
}

function generateIframeSelector(iframe: HTMLIFrameElement, fallbackIndex: number): string {
  // Try to generate a unique selector for the iframe
  if (iframe.id) {
    return `iframe#${iframe.id}`;
  }

  if (iframe.name) {
    return `iframe[name="${iframe.name}"]`;
  }

  if (iframe.src) {
    return `iframe[src*="${new URL(iframe.src).pathname}"]`;
  }

  // Try to find a unique class
  if (iframe.className) {
    const classes = iframe.className.split(' ').filter((cls) => cls.trim());
    if (classes.length > 0) {
      return `iframe.${classes.join('.')}`;
    }
  }

  // Fallback to nth-child selector
  return `iframe:nth-of-type(${fallbackIndex + 1})`;
}

function generateShadowSelector(host: Element, fallbackIndex: number): string {
  // Try to generate a unique selector for the shadow host
  if (host.id) {
    return `#${host.id}`;
  }

  if (host.tagName) {
    const tagName = host.tagName.toLowerCase();

    // Try to find a unique class
    if (host.className) {
      const classes = host.className.split(' ').filter((cls) => cls.trim());
      if (classes.length > 0) {
        return `${tagName}.${classes.join('.')}`;
      }
    }

    // Try to find unique attributes
    const uniqueAttrs = ['data-testid', 'data-test-id', 'data-id', 'data-for', 'name', 'role'];
    for (const attr of uniqueAttrs) {
      const value = host.getAttribute(attr);
      if (value) {
        return `${tagName}[${attr}="${value}"]`;
      }
    }

    // Fallback to nth-child selector
    return `${tagName}:nth-of-type(${fallbackIndex + 1})`;
  }

  // Ultimate fallback
  return `*:nth-of-type(${fallbackIndex + 1})`;
}

function findShadowHosts(rootDocument: Document): Element[] {
  const shadowHosts: Element[] = [];

  // Walk through all elements in the document
  const walker = document.createTreeWalker(
    rootDocument.body || rootDocument,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as Element;
        // Check if element has a shadow root
        if (element.shadowRoot) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    },
  );

  let node: Node | null;
  while (true) {
    node = walker.nextNode();
    if (!node) break;
    shadowHosts.push(node as Element);
  }

  return shadowHosts;
}

function isElementInDocument(element: Element, doc: Document): boolean {
  return doc.contains(element);
}

function findElementDocument(
  element: Element,
  contexts: DocumentContext[],
): DocumentContext | null {
  for (const context of contexts) {
    if (isElementInDocument(element, context.document)) {
      return context;
    }
  }
  return null;
}

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

// Enhanced version that includes iframe context
function parseSelectorsTreeWithIframes(
  input: Element,
  parentNode: XNode | null,
  iframeContext = '',
  depth = 0,
): XNode | null {
  const selectors = queryElementSelectors(input);
  if (selectors.length === 0) {
    return parentNode;
  }

  const currentNode: XNode = {
    previousElementSelectors: [],
    nextElementSelectors: [],
    selectors,
    depth,
    iframeContext,
    isInIframe: !!iframeContext,
  };

  if (input.previousElementSibling) {
    currentNode.previousElementSelectors = queryElementSelectors(input.previousElementSibling);
  }
  if (input.nextElementSibling) {
    currentNode.nextElementSelectors = queryElementSelectors(input.nextElementSibling);
  }

  if (parentNode === null) {
    if (input.parentElement) {
      parseSelectorsTreeWithIframes(input.parentElement, currentNode, iframeContext, depth + 1);
    }
    return currentNode;
  }

  parentNode.parentNode = currentNode;
  if (input.parentElement) {
    parseSelectorsTreeWithIframes(input.parentElement, currentNode, iframeContext, depth + 1);
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
  iframeContext?: string;
  isInIframe?: boolean;
};

export function parserV2(element: HTMLElement, searchInIframes = false): TargetResult {
  const content = element.innerText ?? '';
  let selectors: XNode | null;
  let iframeContext: string | undefined;
  let isInIframe = false;

  if (searchInIframes) {
    // Determine if element is in an iframe or shadow DOM
    const contexts = getAllAccessibleDocuments();
    const elementContext = findElementDocument(element, contexts);

    if (elementContext?.selector) {
      iframeContext = elementContext.selector;
      isInIframe =
        elementContext.contextType === 'iframe' || elementContext.contextType === 'shadow';
      selectors = parseSelectorsTreeWithIframes(element, null, iframeContext);
    } else {
      selectors = parseSelectorsTree(element, null);
    }
  } else {
    selectors = parseSelectorsTree(element, null);
  }

  const selectorsList = queryElementSelectors(element);
  return { content, selectors, selectorsList, iframeContext, isInIframe };
}

/**
 * Find element using enhanced selector system with optional iframe support
 * @param target - Target configuration with selectors and options
 * @param root - Root document or element to search within
 * @returns HTMLElement if found, null otherwise
 *
 * Note: When searchInIframes is true, this function searches across all accessible iframes
 * but only returns the HTMLElement for backward compatibility. Use findElementWithIframes()
 * to get the full iframe context information.
 */
export function finderV2(target: Target, root: Element | Document = document): HTMLElement | null {
  const {
    selectors,
    content = '',
    sequence = 0,
    precision = 'strict',
    isDynamicContent = false,
    customSelector = '',
    type = 'auto',
    searchInIframes = false,
  } = target;

  // If iframe search is enabled, search across all accessible documents
  if (searchInIframes) {
    const result = finderV2WithIframes(target, root as Document);
    return result ? result.element : null;
  }

  // Original logic for single document search
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

// New function for iframe and shadow DOM aware element finding
export function finderV2WithIframes(
  target: Target,
  root: Document = document,
): FinderResult | null {
  const contexts = getAllAccessibleDocuments(root);

  const {
    selectors,
    content = '',
    sequence = 0,
    precision = 'strict',
    isDynamicContent = false,
    customSelector = '',
    type = 'auto',
  } = target;

  if (type === 'auto' && selectors) {
    const mapping: any = {
      looser: 1,
      loose: 3,
      loosest: 5,
      strict: 7,
      stricter: 8,
      strictest: 10,
    };

    // Try to find element in each context
    for (const context of contexts) {
      const el = finderX(selectors, context.document, mapping[precision]) as HTMLElement;
      if (el) {
        if (isDynamicContent && content && el.innerText !== content) {
          continue;
        }
        return {
          element: el,
          iframeContext: context.selector,
          isInIframe: !!context.selector,
        };
      }
    }
  } else if (customSelector) {
    // Handle custom selector case across all contexts
    const sequenceMapping: any = {
      '1st': 0,
      '2st': 1,
      '3st': 2,
      '4st': 3,
      '5st': 4,
    };

    for (const context of contexts) {
      try {
        const selector = customSelector.replace(/\\\\/g, '\\');
        const elements = context.document.querySelectorAll(selector);
        if (elements.length > 0) {
          const el = elements[sequenceMapping[sequence]] || elements[0];
          if (content && el.textContent?.trim() !== content) {
            continue;
          }
          return {
            element: el as HTMLElement,
            iframeContext: context.selector,
            isInIframe: !!context.selector,
          };
        }
      } catch (error) {
        console.warn(`Selector error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

// ============================================================================
// IFRAME SUPPORT FUNCTIONS
// ============================================================================
// These functions provide enhanced iframe traversal capabilities while
// maintaining backward compatibility with existing code.

/**
 * Generate selectors for an element with iframe and shadow DOM context awareness
 * @param element - The HTML element to generate selectors for
 * @returns Target object with iframe and shadow DOM aware selectors and context
 */
export function generateSelectorsWithIframes(element: HTMLElement): Target {
  const contexts = getAllAccessibleDocuments();
  const elementContext = findElementDocument(element, contexts);

  let iframeContext = '';
  if (elementContext?.selector) {
    iframeContext = elementContext.selector;
  }

  const node = iframeContext
    ? parseSelectorsTreeWithIframes(element, null, iframeContext)
    : parseSelectorsTree(element, null);

  return {
    selectors: node,
    iframeContext,
    searchInIframes: true,
    type: 'auto',
    precision: 'strict',
  };
}

/**
 * Find element across all accessible documents (including iframes and shadow DOMs)
 * Returns the full FinderResult with iframe/shadow DOM context information
 */
export function findElementWithIframes(target: Target): FinderResult | null {
  return finderV2WithIframes(target);
}

/**
 * Find element with iframe and shadow DOM support but return only the HTMLElement (backward compatible)
 * This is equivalent to finderV2 with searchInIframes: true
 */
export function findElementInIframes(target: Target): HTMLElement | null {
  const result = finderV2WithIframes(target);
  return result ? result.element : null;
}

/**
 * Check if an element is inside an iframe or shadow DOM
 */
export function isElementInIframe(element: HTMLElement): boolean {
  const contexts = getAllAccessibleDocuments();
  const elementContext = findElementDocument(element, contexts);
  return !!elementContext?.selector;
}

/**
 * Get iframe or shadow DOM context for an element
 */
export function getElementIframeContext(element: HTMLElement): string | null {
  const contexts = getAllAccessibleDocuments();
  const elementContext = findElementDocument(element, contexts);
  return elementContext?.selector || null;
}

/**
 * Check if an element is specifically inside a shadow DOM
 */
export function isElementInShadowDOM(element: HTMLElement): boolean {
  const contexts = getAllAccessibleDocuments();
  const elementContext = findElementDocument(element, contexts);
  return elementContext?.contextType === 'shadow';
}

/**
 * Check if an element is specifically inside an iframe
 */
export function isElementInIframeOnly(element: HTMLElement): boolean {
  const contexts = getAllAccessibleDocuments();
  const elementContext = findElementDocument(element, contexts);
  return elementContext?.contextType === 'iframe';
}
