/**
 * Compile markdown (the representation `text` block) back into a Slate document — the
 * inverse of text.decompile.ts. Supports the subset the decompiler emits: paragraph /
 * h1 / h2 / bulleted + numbered lists / code, bold / italic, links, and the
 * Liquid user-attribute syntax `{{ code | default: "fallback" }}`.
 *
 * Intentionally small (no markdown dependency) — it round-trips our own output,
 * not arbitrary markdown.
 */

type SlateNode = Record<string, unknown>;

// One special inline token: {{liquid}}, [text](url), **bold**, or *italic*.
const INLINE = /(\{\{[^}]*\}\}|\[[^\]]*\]\([^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*)/;

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseLiquid(token: string): SlateNode {
  const inner = token.slice(2, -2).trim();
  const [codePart, ...filters] = inner.split('|').map((s) => s.trim());
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

function parseLink(token: string): SlateNode {
  const m = token.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
  const url = m?.[2] ?? '';
  // The runtime derives a link's href from `data` (a Slate value, so a URL can hold
  // `{{ user-attribute }}` tokens): `replaceUserAttr` does `url = data ? extract(data) : ''`,
  // so a link without `data` renders href="". Store the url as `data` (the source of
  // truth the runtime reads) AND as `url` (what decompile reads back) — mirrors how a
  // `navigate` action stores its url as `value: compileText(url)`.
  return { type: 'link', url, data: compileText(url), children: [{ text: m?.[1] ?? '' }] };
}

function parseInline(text: string): SlateNode[] {
  const nodes: SlateNode[] = [];
  let rest = text;
  while (rest.length > 0) {
    const m = rest.match(INLINE);
    if (!m || m.index === undefined) {
      nodes.push({ text: rest });
      break;
    }
    if (m.index > 0) {
      nodes.push({ text: rest.slice(0, m.index) });
    }
    const tok = m[0];
    if (tok.startsWith('{{')) {
      nodes.push(parseLiquid(tok));
    } else if (tok.startsWith('[')) {
      nodes.push(parseLink(tok));
    } else if (tok.startsWith('**')) {
      nodes.push({ text: tok.slice(2, -2), bold: true });
    } else {
      nodes.push({ text: tok.slice(1, -1), italic: true });
    }
    rest = rest.slice(m.index + tok.length);
  }
  return nodes.length > 0 ? nodes : [{ text: '' }];
}

const listItem = (line: string, marker: RegExp): SlateNode => ({
  type: 'list-item',
  children: parseInline(line.replace(marker, '')),
});

export function compileText(md: string): SlateNode[] {
  const lines = (md ?? '').split('\n');
  const blocks: SlateNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ type: 'code', children: [{ text: code.join('\n') }] });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', children: parseInline(line.slice(2)) });
      i++;
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', children: parseInline(line.slice(3)) });
      i++;
    } else if (/^[-*] /.test(line)) {
      const items: SlateNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(listItem(lines[i], /^[-*] /));
        i++;
      }
      blocks.push({ type: 'bulleted-list', children: items });
    } else if (/^\d+\.\s/.test(line)) {
      const items: SlateNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(listItem(lines[i], /^\d+\.\s/));
        i++;
      }
      blocks.push({ type: 'numbered-list', children: items });
    } else {
      blocks.push({ type: 'paragraph', children: parseInline(line) });
      i++;
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', children: [{ text: '' }] }];
}
