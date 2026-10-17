import { resolveUserInfo } from '../resolve-user-info';

const user = { id: 'u1' };

describe('resolveUserInfo', () => {
  it('is null without a session id, whatever the query says', () => {
    expect(
      resolveUserInfo({ uid: undefined, data: user, loading: false, error: undefined }),
    ).toBeNull();
    expect(
      resolveUserInfo({ uid: '', data: undefined, loading: true, error: undefined }),
    ).toBeNull();
  });

  it('is undefined while the first response is loading', () => {
    expect(
      resolveUserInfo({ uid: 'u1', data: undefined, loading: true, error: undefined }),
    ).toBeUndefined();
  });

  it('is the user once loaded', () => {
    expect(resolveUserInfo({ uid: 'u1', data: user, loading: false, error: undefined })).toBe(user);
  });

  it('keeps the previous user during a refetch', () => {
    expect(resolveUserInfo({ uid: 'u1', data: user, loading: true, error: undefined })).toBe(user);
  });

  it('keeps the user when a field error arrives next to partial data', () => {
    // errorPolicy 'all': `me` resolved, `me.projects` did not. Still signed in.
    expect(
      resolveUserInfo({ uid: 'u1', data: user, loading: false, error: new Error('projects') }),
    ).toBe(user);
  });

  it('is null when the query answered with no user', () => {
    expect(
      resolveUserInfo({ uid: 'u1', data: undefined, loading: false, error: new Error('down') }),
    ).toBeNull();
    expect(resolveUserInfo({ uid: 'u1', data: null, loading: false, error: undefined })).toBeNull();
  });
});
