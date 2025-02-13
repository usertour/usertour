const P = new WeakSet();
import { getComputedStyle } from './getComputedStyle';

function findIframeView(target: any) {
  const targetView = target.ownerDocument ? target.ownerDocument.defaultView : null;
  if (!targetView) {
    return null;
  }
  if (P.has(targetView)) return null;
  {
    const targetFrame = targetView.frameElement;
    if (!targetFrame) {
      P.add(targetView);
    }
    return targetFrame;
  }
}

export function isVisibleNode(targetNode: any) {
  let node = targetNode;
  let isCheckVisible = true;
  if (!targetNode || !targetNode.parentNode) {
    return false;
  }
  while (node) {
    const isBodyNode = node === document.body;
    const isBody = 'BODY' === node.tagName;
    const nodeComputedStyle = getComputedStyle(node);
    if (isCheckVisible) {
      if (nodeComputedStyle.visibility && 'visible' !== nodeComputedStyle.visibility) {
        return false;
      }
      isCheckVisible = false;
    }
    if ('none' === nodeComputedStyle.display) {
      return false;
    }

    if (null != nodeComputedStyle.opacity && Number.parseFloat(nodeComputedStyle.opacity) < 0.01) {
      return false;
    }

    if (isBodyNode) {
      break;
    }
    if (isBody) {
      node = findIframeView(node);
      isCheckVisible = true;
    } else {
      node = node.parentElement;
    }
  }
  return true;
}
