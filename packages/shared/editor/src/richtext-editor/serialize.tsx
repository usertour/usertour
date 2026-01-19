import { Text, type Descendant, type Element as SlateElement } from 'slate';
import { isText } from '../lib/editorHelper';
import { getTextStyles } from '../lib/styles';
import type { CustomElementStrings, TextAlignFormat } from '../types/slate';
import { ALIGN_MAPPING } from './editor';
import { ELEMENTS } from './elements';

/**
 * Serialize a text leaf node to JSX for rendering
 * Uses shared getTextStyles utility for consistent styling
 */
export const serializeLeaf = (node: Descendant, key = '') => {
  if (!Text.isText(node)) {
    return null;
  }
  const string = node.text;

  // Skip empty text nodes to avoid rendering unnecessary &nbsp;
  // These are typically created by Slate around inline elements
  if (!string) {
    return null;
  }

  const style = getTextStyles(node);

  return (
    <span style={style} key={key}>
      {string}
    </span>
  );
};

/**
 * Serialize a Slate node tree to plain text string
 * Used for simple text extraction with user attribute placeholders
 */
export const serializeMini = (node: Descendant): string => {
  if (Text.isText(node)) {
    return node.text;
  }
  if (node.type && node.type === 'user-attribute') {
    return `{${node.attrCode || node.fallback}}`;
  }

  if (node.children) {
    return node.children.map((n: Descendant) => serializeMini(n)).join('');
  }
  return '';
};

// Callback type for element click handlers
type SerializeCallback = (type: string, params: Record<string, unknown>) => void;

/**
 * Internal serialize function with path tracking for stable keys
 */
const serializeNode = (
  node: Descendant,
  path: string,
  callback?: SerializeCallback,
): React.ReactNode => {
  if (isText(node)) {
    return serializeLeaf(node, path);
  }

  // Type guard for element nodes
  const element = node as SlateElement;
  const children = element.children?.map((n: Descendant, i: number) =>
    serializeNode(n, `${path}-${i}`, callback),
  );
  const cls = 'align' in element ? ALIGN_MAPPING[element.align as TextAlignFormat] : '';
  const type = element.type as CustomElementStrings;
  const Comp = ELEMENTS[type]?.serialize;

  if (!Comp) {
    return children;
  }

  if (callback) {
    return (
      <Comp className={cls} element={element} key={path} onClick={callback}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp className={cls} element={element} key={path}>
      {children}
    </Comp>
  );
};

/**
 * Serialize a Slate node tree to React elements
 * Uses path-based keys for stable React reconciliation
 * @param node - The Slate node to serialize
 * @param callback - Optional click callback for elements
 * @param index - Optional index for stable keys when used in array.map()
 */
export const serialize = (
  node: Descendant,
  callback?: SerializeCallback,
  index = 0,
): React.ReactNode => {
  return serializeNode(node, String(index), callback);
};
