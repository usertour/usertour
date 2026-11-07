export function getWindow(node: Node | null | undefined): Window {
  return node?.ownerDocument?.defaultView || window;
}
