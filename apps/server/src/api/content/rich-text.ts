/**
 * Decompile a `text` element's Slate document into markdown + a Liquid subset
 * for user-attribute inlines (`{{ attrCode | default: "fallback" }}`).
 *
 * Covered: paragraph / h1 / h2 / lists / code / link / bold / italic +
 * user-attribute. Not expressible in markdown (underline / color / alignment) is
 * dropped from the view — preserved across writes by the field-level merge, so
 * an edit only resets the marks on a block whose markdown is actually rewritten.
 */

type SlateNode = {
  text?: string;
  bold?: boolean;
  italic?: boolean;
  type?: string;
  children?: SlateNode[];
  url?: string;
  openType?: string;
  attrCode?: string;
  fallback?: string;
};

function isLeaf(node: SlateNode): boolean {
  return typeof node.text === 'string';
}

function leafToMarkdown(node: SlateNode): string {
  const text = node.text ?? '';
  if (text.length === 0) {
    return '';
  }
  let out = text;
  if (node.bold) {
    out = `**${out}**`;
  }
  if (node.italic) {
    out = `*${out}*`;
  }
  return out;
}

function userAttrToLiquid(node: SlateNode): string {
  const code = node.attrCode ?? '';
  const fallback = node.fallback ?? '';
  return fallback ? `{{ ${code} | default: ${JSON.stringify(fallback)} }}` : `{{ ${code} }}`;
}

/** Render inline content (leaves + inline nodes) of a block. */
function inlineToMarkdown(node: SlateNode): string {
  if (isLeaf(node)) {
    return leafToMarkdown(node);
  }
  switch (node.type) {
    case 'link':
      return `[${childrenToMarkdown(node.children)}](${node.url ?? ''})`;
    case 'user-attribute':
      return userAttrToLiquid(node);
    default:
      return childrenToMarkdown(node.children);
  }
}

function childrenToMarkdown(nodes: SlateNode[] | undefined): string {
  return (nodes ?? []).map(inlineToMarkdown).join('');
}

function plainText(nodes: SlateNode[] | undefined): string {
  return (nodes ?? []).map((n) => (isLeaf(n) ? (n.text ?? '') : plainText(n.children))).join('');
}

function blockToMarkdown(node: SlateNode): string {
  if (isLeaf(node)) {
    return leafToMarkdown(node);
  }
  switch (node.type) {
    case 'h1':
      return `# ${childrenToMarkdown(node.children)}`;
    case 'h2':
      return `## ${childrenToMarkdown(node.children)}`;
    case 'code':
      return ['```', plainText(node.children), '```'].join('\n');
    case 'bulleted-list':
      return (node.children ?? []).map((li) => `- ${childrenToMarkdown(li.children)}`).join('\n');
    case 'numbered-list':
      return (node.children ?? [])
        .map((li, i) => `${i + 1}. ${childrenToMarkdown(li.children)}`)
        .join('\n');
    default:
      // paragraph and any other block container
      return childrenToMarkdown(node.children);
  }
}

/** Slate doc (a `text` element's `data`) → markdown string. */
export function richTextToMarkdown(data: unknown): string {
  if (!Array.isArray(data)) {
    return '';
  }
  return (data as SlateNode[])
    .map(blockToMarkdown)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
