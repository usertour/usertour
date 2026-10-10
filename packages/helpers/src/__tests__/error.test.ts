import { isResourceAlreadyExistsError, serverErrorCode } from '../error';

const failedWith = (code: unknown) => ({ graphQLErrors: [{ extensions: { code } }] });

describe('serverErrorCode', () => {
  test('reads the catalogue code off the first GraphQL error', () => {
    expect(serverErrorCode(failedWith('E0048'))).toBe('E0048');
  });

  test('is undefined without a GraphQL error or without a string code', () => {
    expect(serverErrorCode(new Error('network'))).toBeUndefined();
    expect(serverErrorCode('boom')).toBeUndefined();
    expect(serverErrorCode(null)).toBeUndefined();
    expect(serverErrorCode({ graphQLErrors: [] })).toBeUndefined();
    expect(serverErrorCode(failedWith(48))).toBeUndefined();
  });
});

describe('isResourceAlreadyExistsError', () => {
  test('matches only the taken-identifier code', () => {
    expect(isResourceAlreadyExistsError(failedWith('E0048'))).toBe(true);
    expect(isResourceAlreadyExistsError(failedWith('E0000'))).toBe(false);
    expect(isResourceAlreadyExistsError(new Error('network'))).toBe(false);
  });
});
