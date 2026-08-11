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

function userAttrToLiquid(node: SlateNode): string {
  const code = node.attrCode ?? '';
  const fallback = node.fallback ?? '';
  return fallback ? `{{ ${code} | default: ${JSON.stringify(fallback)} }}` : `{{ ${code} }}`;
}

/** A non-leaf inline node (link / user-attribute / unknown container). */
function inlineNodeToMarkdown(node: SlateNode): string {
  switch (node.type) {
    case 'link':
      // openType 'new' round-trips as the one recognized attribute suffix (see
      // text.compile NEW_TAB_SUFFIX) — without it, editing any text containing
      // a builder-set New-tab link silently degraded it to same-tab.
      return `[${childrenToMarkdown(node.children)}](${node.url ?? ''})${node.openType === 'new' ? '{target=_blank}' : ''}`;
    case 'user-attribute':
      return userAttrToLiquid(node);
    default:
      return childrenToMarkdown(node.children);
  }
}

/**
 * Emit inline content by grouping consecutive nodes into RUNS of identical
 * marks and wrapping each run ONCE — never per leaf. Per-leaf wrapping broke
 * around `{{ }}` interpolation: a user-attribute node carries no marks of its
 * own (the widget renders the value unstyled regardless), so a bold span
 * containing one fragmented into `**Hi **{{ name }}**!**`, and when the liquid
 * ended the span the output was `*Hey *{{ name }}` — a space-before-closer
 * that CommonMark refuses, silently degrading the emphasis to literal
 * asterisks on the next write. In a run, the interpolation is a full member
 * carrying its OWN element flags (set by compile from the surrounding
 * emphasis, or by the builder chip), and leading/trailing run whitespace
 * moves OUTSIDE the markers (an emphasis closer must not follow a space; a
 * bold space renders the same as a plain one). Links stay run barriers:
 * their marks live innermost (canonical form `[**text**](url)`).
 */
function childrenToMarkdown(nodes: SlateNode[] | undefined): string {
  type Run = { bold: boolean; italic: boolean; text: string };
  const runs: Run[] = [];
  const push = (bold: boolean, italic: boolean, text: string) => {
    if (text.length === 0) {
      return;
    }
    const last = runs[runs.length - 1];
    if (last && last.bold === bold && last.italic === italic) {
      last.text += text;
      return;
    }
    runs.push({ bold, italic, text });
  };
  for (const node of nodes ?? []) {
    if (isLeaf(node)) {
      push(Boolean(node.bold), Boolean(node.italic), node.text ?? '');
    } else if (node.type === 'user-attribute') {
      // The node's OWN element flags decide its run — so `**{{ name }}**`
      // round-trips, and a legacy unflagged interpolation between bold leaves
      // stays outside the emphasis (its name never rendered bold; adopting the
      // neighbours' marks here would bold it on the next write-back).
      push(Boolean(node.bold), Boolean(node.italic), userAttrToLiquid(node));
    } else {
      // Link (or unknown container): a barrier — emit unmarked, marks stay inside.
      push(false, false, inlineNodeToMarkdown(node));
    }
  }
  return runs
    .map(({ bold, italic, text }) => {
      const lead = text.match(/^\s*/)?.[0] ?? '';
      const trail = text.length > lead.length ? (text.match(/\s*$/)?.[0] ?? '') : '';
      const core = text.slice(lead.length, text.length - trail.length);
      if (core.length === 0) {
        return text;
      }
      let out = core;
      if (bold) {
        out = `**${out}**`;
      }
      if (italic) {
        out = `*${out}*`;
      }
      return `${lead}${out}${trail}`;
    })
    .join('');
}

function plainText(nodes: SlateNode[] | undefined): string {
  return (nodes ?? []).map((n) => (isLeaf(n) ? (n.text ?? '') : plainText(n.children))).join('');
}

function blockToMarkdown(node: SlateNode): string {
  if (isLeaf(node)) {
    return childrenToMarkdown([node]);
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
export function decompileText(data: unknown): string {
  if (!Array.isArray(data)) {
    return '';
  }
  return (data as SlateNode[])
    .map(blockToMarkdown)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Inverse of `compilePlainText`: raw leaf text + `{{ }}` user-attribute inlines,
 * with NO markdown marks. For fields whose value is PLAIN text (resource-center
 * block names / navigate URLs). Decompiling those with the markdown `decompileText`
 * would emit `**` / `*` / `[](…)` that `compilePlainText` then stores literally,
 * silently corrupting the value on an otherwise-unmodified round-trip.
 */
export function decompilePlainText(data: unknown): string {
  if (!Array.isArray(data)) {
    return '';
  }
  const inline = (node: SlateNode): string => {
    if (isLeaf(node)) {
      return node.text ?? '';
    }
    if (node.type === 'user-attribute') {
      return userAttrToLiquid(node);
    }
    return (node.children ?? []).map(inline).join('');
  };
  return (data as SlateNode[]).map(inline).join('').trim();
}
