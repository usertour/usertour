/** The parts of a V8 sampling heap profile node the summary reads. */
export interface SamplingHeapProfileNode {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children?: SamplingHeapProfileNode[];
}

export interface HeapProfileSummaryRow {
  site: string;
  bytes: number;
}

export interface HeapProfileSummary {
  /** Bytes sampled in the window and still alive when it ended. */
  totalBytes: number;
  /** Grouped by the innermost frame that belongs to the application. */
  byApplicationFrame: HeapProfileSummaryRow[];
  /** Grouped by the innermost frames of the allocation, application or not. */
  byAllocationSite: HeapProfileSummaryRow[];
}

const NO_APPLICATION_FRAME = '(no application frame)';
const SITE_DEPTH = 4;

const PACKAGE_DIRECTORY = 'node_modules/';

/**
 * A frame as `function file:line`. A dependency's file keeps its package name
 * (the path after the last node_modules/, so pnpm's nested store collapses to
 * `@scope/package/dist/index.js`); any other file keeps its last three path
 * segments, enough to tell the workspace packages apart (`helpers/dist/index.js`)
 * and to place the application's own files in their module.
 */
const describeFrame = (frame: SamplingHeapProfileNode['callFrame']): string => {
  const packageStart = frame.url.lastIndexOf(PACKAGE_DIRECTORY);
  const file =
    packageStart >= 0
      ? frame.url.slice(packageStart + PACKAGE_DIRECTORY.length)
      : frame.url.split('/').slice(-3).join('/') || '(native)';
  return `${frame.functionName || '(anonymous)'} ${file}:${frame.lineNumber + 1}`;
};

const topRows = (totals: Map<string, number>, limit: number): HeapProfileSummaryRow[] =>
  [...totals.entries()]
    .map(([site, bytes]) => ({ site, bytes }))
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, limit);

/**
 * Summarise a sampling heap profile taken without the collected-objects
 * flags, so every sample is an object still alive when sampling stopped.
 * `applicationPath` marks the frames that are the application's own code.
 */
export const summarizeHeapProfile = (
  head: SamplingHeapProfileNode,
  applicationPath: string,
  limit: number,
): HeapProfileSummary => {
  const byApplicationFrame = new Map<string, number>();
  const byAllocationSite = new Map<string, number>();
  let totalBytes = 0;
  // Iterative walk: allocation stacks can be deeper than a recursion budget.
  const pending: Array<{
    node: SamplingHeapProfileNode;
    path: SamplingHeapProfileNode['callFrame'][];
  }> = [{ node: head, path: [] }];
  while (pending.length > 0) {
    const { node, path } = pending.pop() as (typeof pending)[number];
    const stack = [...path, node.callFrame];
    if (node.selfSize > 0) {
      totalBytes += node.selfSize;
      const site = stack.slice(-SITE_DEPTH).reverse().map(describeFrame).join(' <- ');
      byAllocationSite.set(site, (byAllocationSite.get(site) ?? 0) + node.selfSize);
      const applicationFrame = [...stack]
        .reverse()
        .find((frame) => frame.url.includes(applicationPath));
      const owner = applicationFrame ? describeFrame(applicationFrame) : NO_APPLICATION_FRAME;
      byApplicationFrame.set(owner, (byApplicationFrame.get(owner) ?? 0) + node.selfSize);
    }
    for (const child of node.children ?? []) {
      pending.push({ node: child, path: stack });
    }
  }
  return {
    totalBytes,
    byApplicationFrame: topRows(byApplicationFrame, limit),
    byAllocationSite: topRows(byAllocationSite, limit),
  };
};
