import {
  debugFlagNamesNamespace,
  debugQueryParamEnabled,
  withDebugNamespace,
  withoutDebugNamespace,
} from '../debug-flag';

const NS = 'usertour-widget';

describe('debugFlagNamesNamespace', () => {
  test.each([
    ['wildcard', '*', true],
    ['exact namespace', 'usertour-widget', true],
    ['namespace wildcard', 'usertour-widget:*', true],
    ['namespace scope', 'usertour-widget:socket', true],
    ['among other tools', 'socket.io-client:*, usertour-widget:*', true],
    ['other tool only', 'socket.io-client:*', false],
    ['prefix that is not ours', 'usertour-widgets', false],
    ['empty', '', false],
    ['whitespace', '  ', false],
  ])('%s', (_, value, expected) => {
    expect(debugFlagNamesNamespace(value, NS)).toBe(expected);
  });
});

describe('debugQueryParamEnabled', () => {
  test.each([
    ['?usertour_debug=1', true],
    ['?usertour_debug=true', true],
    ['?usertour_debug=TRUE', true],
    ['?usertour_debug', true],
    ['?a=b&usertour_debug=1&c=d', true],
    ['usertour_debug=1', true],
    ['?usertour_debug=0', false],
    ['?usertour_debug=false', false],
    ['?usertour_debugx=1', false],
    ['?debug=1', false],
    ['', false],
  ])('%s', (search, expected) => {
    expect(debugQueryParamEnabled(search)).toBe(expected);
  });
});

describe('withDebugNamespace / withoutDebugNamespace', () => {
  test('adds our wildcard once, keeping other tokens', () => {
    expect(withDebugNamespace('', NS)).toBe('usertour-widget:*');
    expect(withDebugNamespace('socket.io-client:*', NS)).toBe(
      'socket.io-client:*,usertour-widget:*',
    );
    expect(withDebugNamespace('usertour-widget:*', NS)).toBe('usertour-widget:*');
  });

  test('removes only our tokens and never the wildcard', () => {
    expect(withoutDebugNamespace('usertour-widget:*,socket.io-client:*', NS)).toBe(
      'socket.io-client:*',
    );
    expect(withoutDebugNamespace('usertour-widget,usertour-widget:socket', NS)).toBe('');
    expect(withoutDebugNamespace('*', NS)).toBe('*');
  });
});
