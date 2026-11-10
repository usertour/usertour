/**
 * The documents of every same-origin `<iframe>` under `root`, nested ones
 * included, in document order. A frame whose document the parent cannot read
 * (cross-origin, or sandboxed without `allow-same-origin`) is skipped, as is
 * any frame `isSkipped` rejects.
 */
export function getSameOriginFrameDocuments(
  root: Document,
  isSkipped?: (frame: HTMLIFrameElement) => boolean,
): Document[] {
  const documents: Document[] = [];
  for (const frame of Array.from(root.getElementsByTagName('iframe'))) {
    if (isSkipped?.(frame)) {
      continue;
    }
    const frameDocument = readContentDocument(frame);
    if (!frameDocument) {
      continue;
    }
    documents.push(frameDocument, ...getSameOriginFrameDocuments(frameDocument, isSkipped));
  }
  return documents;
}

function readContentDocument(frame: HTMLIFrameElement): Document | null {
  try {
    return frame.contentDocument;
  } catch {
    return null;
  }
}
