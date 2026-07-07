/**
 * Compile markdown (the representation `text` block) into a Slate document — the
 * inverse of text.decompile.ts. Parsing is delegated to the `markdown-it` library
 * (a real CommonMark tokenizer) rather than a hand-rolled regex tokenizer: the v2
 * API/MCP lets agents author markdown by hand, so this is a public parser of
 * arbitrary markdown, and nesting/precedence (bold-in-link, link-in-bold,
 * bold-in-italic, …) must be handled correctly, not patched one regex at a time.
 *
 * markdown-it emits a FLAT token stream (open/close + `nesting`); `nest()` rebuilds
 * the block tree, and `mapInline()` rebuilds inline nesting with a marks stack.
 * Two non-markdown concerns stay hand-written:
 *  - `{{ attr | default: "x" }}` Liquid → a custom inline rule (so a `*`/`"` inside
 *    the liquid is never mis-parsed as markdown), mapped to a `user-attribute` node.
 *  - plain strings (a link/navigate URL, a block name) must NOT be markdown-parsed
 *    (else a URL like `a*b*c` becomes italic) — `compilePlainText` only splits liquid.
 */

import MarkdownIt from 'markdown-it';

type SlateNode = Record<string, unknown>;

/** The markdown-it token fields this module reads. */
interface MdToken {
  type: string;
  tag: string;
  nesting: number;
  content: string;
  children: MdToken[] | null;
  attrGet(name: string): string | null;
}

interface TreeNode {
  token: MdToken;
  children: TreeNode[];
}

// One markdown-it instance: no raw HTML, no autolink, no soft-break→<br>. Link
// destinations are left verbatim (normalize/validate off) so a URL keeps its `*`,
// spaces and `{{ }}` liquid intact instead of being percent-encoded.
const mdParser = new MarkdownIt({ html: false, linkify: false, breaks: false });
mdParser.normalizeLink = (url) => url;
mdParser.validateLink = () => true;

/** Index of the `}}` that closes the `{{` at `open`, skipping any `}}` inside a
 * quoted filter value (so `{{ x | default: "a}}b" }}` isn't cut short); -1 if none. */
function liquidTokenEnd(src: string, open: number): number {
  let quote: string | null = null;
  for (let i = open + 2; i < src.length - 1; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '}' && src[i + 1] === '}') {
      return i;
    }
  }
  return -1;
}

/** Split on `sep` at the top level, ignoring separators inside quoted strings —
 * so a `|` inside `default: "Pro | Team"` doesn't split the filter list. */
function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === sep) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

// Inline rule: capture `{{ … }}` as a single `liquid` token BEFORE emphasis/link
// rules run, so markdown-significant chars inside the liquid are never parsed.
mdParser.inline.ruler.before(
  'emphasis',
  'liquid',
  // biome-ignore lint/suspicious/noExplicitAny: markdown-it StateInline has no exported public type
  (state: any, silent: boolean): boolean => {
    const start: number = state.pos;
    const src: string = state.src;
    if (src.charCodeAt(start) !== 0x7b /* { */ || src.charCodeAt(start + 1) !== 0x7b) {
      return false;
    }
    const end = liquidTokenEnd(src, start);
    if (end === -1) {
      return false;
    }
    if (!silent) {
      const token = state.push('liquid', '', 0);
      token.content = src.slice(start + 2, end);
    }
    state.pos = end + 2;
    return true;
  },
);

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** `code | default: "x"` (the inside of `{{ }}`) → a user-attribute Slate node. */
function liquidNode(inner: string): SlateNode {
  const [codePart, ...filters] = splitTopLevel(inner ?? '', '|').map((s) => s.trim());
  let fallback = '';
  const def = filters.find((f) => f.startsWith('default'));
  if (def) {
    const m = def.match(/default\s*:\s*(.*)$/);
    if (m) {
      fallback = stripQuotes(m[1]);
    }
  }
  return { type: 'user-attribute', attrCode: codePart, fallback, children: [{ text: '' }] };
}

// --- inline -------------------------------------------------------------------

type Marks = { bold?: boolean; italic?: boolean };

function applyMarks(leaf: SlateNode, marks: Marks): SlateNode {
  const out: SlateNode = { ...leaf };
  if (marks.bold) {
    out.bold = true;
  }
  if (marks.italic) {
    out.italic = true;
  }
  return out;
}

/**
 * Map markdown-it inline tokens to Slate inline nodes. bold/italic are Slate
 * LEAF MARKS (not container nodes), so strong/em just augment the active marks
 * while pushing into the same target; a link is a real container node, so it
 * redirects subsequent leaves into its own `children`.
 */
function mapInline(tokens: MdToken[] | null): SlateNode[] {
  const root: SlateNode[] = [];
  const stack: Array<{ target: SlateNode[]; marks: Marks }> = [{ target: root, marks: {} }];
  const top = () => stack[stack.length - 1];

  for (const t of tokens ?? []) {
    const f = top();
    switch (t.type) {
      case 'text':
      case 'code_inline': // no inline-code mark in the subset — keep the literal text
      case 'image': // no inline image in the subset — keep its alt text
        if (t.content) {
          f.target.push(applyMarks({ text: t.content }, f.marks));
        }
        break;
      case 'softbreak':
        f.target.push(applyMarks({ text: ' ' }, f.marks));
        break;
      case 'hardbreak':
        f.target.push(applyMarks({ text: '\n' }, f.marks));
        break;
      case 'liquid':
        f.target.push(liquidNode(t.content));
        break;
      case 'strong_open':
        stack.push({ target: f.target, marks: { ...f.marks, bold: true } });
        break;
      case 'em_open':
        stack.push({ target: f.target, marks: { ...f.marks, italic: true } });
        break;
      case 'link_open': {
        const url = t.attrGet('href') ?? '';
        const link: SlateNode = { type: 'link', url, data: compilePlainText(url), children: [] };
        f.target.push(link);
        stack.push({ target: link.children as SlateNode[], marks: f.marks });
        break;
      }
      case 'strong_close':
      case 'em_close':
      case 'link_close':
        if (stack.length > 1) {
          stack.pop();
        }
        break;
      default:
        // s_open/s_close (strikethrough, off), html_inline (off), entity handled by
        // markdown-it into `text`, etc. — nothing to emit.
        break;
    }
  }
  return root.length > 0 ? root : [{ text: '' }];
}

// --- blocks -------------------------------------------------------------------

/** Rebuild the block tree from markdown-it's flat open/close token stream. */
function nest(tokens: MdToken[]): TreeNode[] {
  const root: TreeNode[] = [];
  const stack: TreeNode[][] = [root];
  for (const token of tokens) {
    if (token.nesting === 1) {
      const node: TreeNode = { token, children: [] };
      stack[stack.length - 1].push(node);
      stack.push(node.children);
    } else if (token.nesting === -1) {
      stack.pop();
    } else {
      stack[stack.length - 1].push({ token, children: [] });
    }
  }
  return root;
}

const inlineOf = (node: TreeNode): MdToken[] =>
  node.children.find((c) => c.token.type === 'inline')?.token.children ?? [];

/**
 * Collect ALL text from a list-item subtree into a flat inline run. The Slate subset
 * has no nested blocks inside a list item, but markdown-it can put a loose item's
 * continuation paragraphs / a sub-list / a code block under `list_item_open` — gather
 * every descendant `inline` (and fenced/indented code content) so none of it is
 * silently dropped, separating the gathered groups with a space.
 */
function gatherInline(node: TreeNode, acc: SlateNode[]): void {
  for (const c of node.children) {
    const ty = c.token.type;
    if (ty === 'inline') {
      if (acc.length > 0) {
        acc.push({ text: ' ' });
      }
      acc.push(...mapInline(c.token.children));
    } else if (ty === 'fence' || ty === 'code_block') {
      if (acc.length > 0) {
        acc.push({ text: ' ' });
      }
      acc.push({ text: (c.token.content ?? '').replace(/\n$/, '') });
    } else {
      gatherInline(c, acc);
    }
  }
}

function mapListItem(li: TreeNode): SlateNode[] {
  const acc: SlateNode[] = [];
  gatherInline(li, acc);
  return acc.length > 0 ? acc : [{ text: '' }];
}

function mapBlockNode(node: TreeNode): SlateNode[] {
  const t = node.token;
  switch (t.type) {
    case 'heading_open':
      // subset is h1/h2 only — clamp h3+ down to h2
      return [{ type: t.tag === 'h1' ? 'h1' : 'h2', children: mapInline(inlineOf(node)) }];
    case 'paragraph_open':
      return [{ type: 'paragraph', children: mapInline(inlineOf(node)) }];
    case 'fence':
    case 'code_block':
      return [{ type: 'code', children: [{ text: (t.content ?? '').replace(/\n$/, '') }] }];
    case 'bullet_list_open':
    case 'ordered_list_open': {
      const items = node.children
        .filter((c) => c.token.type === 'list_item_open')
        .map((li) => ({ type: 'list-item', children: mapListItem(li) }));
      return [
        {
          type: t.type === 'ordered_list_open' ? 'numbered-list' : 'bulleted-list',
          children: items,
        },
      ];
    }
    case 'blockquote_open':
      // not in the subset — flatten to the inner blocks (keep content, drop the quote)
      return node.children.flatMap(mapBlockNode);
    default:
      // hr, html_block, table (parsed by the default preset, but not in our subset), … → dropped
      return [];
  }
}

const EMPTY_DOC: SlateNode[] = [{ type: 'paragraph', children: [{ text: '' }] }];

/** Markdown string → Slate doc (a `text` element's `data`). */
export function compileText(md: string): SlateNode[] {
  const tokens = mdParser.parse(md ?? '', {}) as unknown as MdToken[];
  const blocks = nest(tokens).flatMap(mapBlockNode);
  return blocks.length > 0 ? blocks : EMPTY_DOC;
}

/**
 * Plain string → Slate doc, WITHOUT markdown parsing — only `{{ }}` liquid is split
 * out. For values that are URLs or names (a link/navigate destination, a block name),
 * where markdown chars (`*`, `_`, `[`) must stay literal. Same block shape as
 * `compileText` so decompileText / extractLinkUrl read it back unchanged.
 */
export function compilePlainText(s: string): SlateNode[] {
  const nodes: SlateNode[] = [];
  const src = s ?? '';
  let pos = 0;
  // Scan for `{{ … }}` with the same quote-aware end-finder the markdown inline
  // rule uses, so a `}}` or `|` inside a `default: "…"` value can't cut the token
  // short (a plain regex `\{\{([^}]*)\}\}` would).
  while (pos < src.length) {
    const open = src.indexOf('{{', pos);
    if (open === -1) {
      break;
    }
    const close = liquidTokenEnd(src, open);
    if (close === -1) {
      break;
    }
    if (open > pos) {
      nodes.push({ text: src.slice(pos, open) });
    }
    nodes.push(liquidNode(src.slice(open + 2, close)));
    pos = close + 2;
  }
  if (pos < src.length) {
    nodes.push({ text: src.slice(pos) });
  }
  return [{ type: 'paragraph', children: nodes.length > 0 ? nodes : [{ text: '' }] }];
}
