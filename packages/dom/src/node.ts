import { getWindow } from './getWindow';

export function isNode(value: any): value is Node {
  const win = getWindow(value) as Window & typeof globalThis;
  return value instanceof win.Node;
}

export function getNodeName(node: Node | Window): string {
  if (isNode(node)) {
    return (node.nodeName || '').toLowerCase();
  }
  // Mocked nodes in testing environments may not be instances of Node. By
  // returning `#document` an infinite loop won't occur.
  // https://github.com/floating-ui/floating-ui/issues/2317
  return '#document';
}
