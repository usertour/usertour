import { SamplingHeapProfileNode, summarizeHeapProfile } from './heap-profile-summary';

const APPLICATION = '/app/apps/server/dist/';

const frame = (
  functionName: string,
  url: string,
  selfSize = 0,
  children: SamplingHeapProfileNode[] = [],
): SamplingHeapProfileNode => ({
  callFrame: { functionName, url, lineNumber: 9 },
  selfSize,
  children,
});

describe('summarizeHeapProfile', () => {
  // (root)
  //   handle (app) -> parse (library) -> 3 MB
  //   handle (app) -> 1 MB
  //   tick (node internals) -> 2 MB
  const head = frame('(root)', '', 0, [
    frame('handle', `file://${APPLICATION}web-socket/core/handler.js`, 1 * 1048576, [
      frame('parse', 'file:///app/node_modules/lib/parse.js', 3 * 1048576),
    ]),
    frame('tick', 'node:internal/timers', 2 * 1048576),
  ]);

  it('attributes memory to the innermost application frame on its stack', () => {
    const summary = summarizeHeapProfile(head, APPLICATION, 10);
    expect(summary.totalBytes).toBe(6 * 1048576);
    expect(summary.byApplicationFrame).toEqual([
      { site: 'handle web-socket/core/handler.js:10', bytes: 4 * 1048576 },
      { site: '(no application frame)', bytes: 2 * 1048576 },
    ]);
  });

  it('names allocation sites by their innermost frames, largest first', () => {
    const summary = summarizeHeapProfile(head, APPLICATION, 10);
    expect(summary.byAllocationSite[0]).toEqual({
      site: 'parse lib/parse.js:10 <- handle web-socket/core/handler.js:10 <- (root) (native):10',
      bytes: 3 * 1048576,
    });
    expect(summary.byAllocationSite.map((row) => row.bytes)).toEqual([
      3 * 1048576,
      2 * 1048576,
      1 * 1048576,
    ]);
  });

  it("names a dependency by its package, through pnpm's nested store", () => {
    const store = 'file:///app/node_modules/.pnpm';
    const profile = frame('(root)', '', 0, [
      frame(
        'increment',
        `${store}/@nestjs+throttler@6.5.0_x/node_modules/@nestjs/throttler/dist/index.js`,
        2048,
      ),
      frame('onPacket', `${store}/socket.io@4.8.1/node_modules/socket.io/dist/index.js`, 1024),
    ]);
    const sites = summarizeHeapProfile(profile, APPLICATION, 10).byAllocationSite.map(
      (row) => row.site,
    );
    expect(sites).toEqual([
      'increment @nestjs/throttler/dist/index.js:10 <- (root) (native):10',
      'onPacket socket.io/dist/index.js:10 <- (root) (native):10',
    ]);
  });

  it('tells the workspace packages apart, which resolve outside node_modules', () => {
    const profile = frame('(root)', '', 0, [
      frame('evaluate', 'file:///app/packages/helpers/dist/index.js', 2048),
      frame('parse', 'file:///app/packages/types/dist/index.js', 1024),
    ]);
    const sites = summarizeHeapProfile(profile, APPLICATION, 10).byAllocationSite.map(
      (row) => row.site,
    );
    expect(sites).toEqual([
      'evaluate helpers/dist/index.js:10 <- (root) (native):10',
      'parse types/dist/index.js:10 <- (root) (native):10',
    ]);
  });

  it('keeps only the requested number of rows', () => {
    const summary = summarizeHeapProfile(head, APPLICATION, 1);
    expect(summary.byApplicationFrame).toHaveLength(1);
    expect(summary.byAllocationSite).toHaveLength(1);
  });
});
