import { isResourceAlreadyExistsError, serverErrorCode, serverErrorMessage } from '../error';

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

describe('serverErrorMessage', () => {
  test('is the server sentence when the error carries a catalogue code', () => {
    const error = {
      graphQLErrors: [{ message: '该标识的资源已存在', extensions: { code: 'E0048' } }],
    };
    expect(serverErrorMessage(error)).toBe('该标识的资源已存在');
  });

  test('is undefined for a transport code, a missing code, or no GraphQL error', () => {
    const transport = {
      graphQLErrors: [
        { message: 'Internal Server Error', extensions: { code: 'Internal Server Error' } },
      ],
    };
    expect(serverErrorMessage(transport)).toBeUndefined();
    const unknown = {
      graphQLErrors: [{ message: 'Unknown error', extensions: { code: 'E0000' } }],
    };
    expect(serverErrorMessage(unknown)).toBeUndefined();
    expect(serverErrorMessage({ graphQLErrors: [{ message: 'x' }] })).toBeUndefined();
    expect(serverErrorMessage(new Error('network'))).toBeUndefined();
  });
});

describe('isResourceAlreadyExistsError', () => {
  test('matches only the taken-identifier code', () => {
    expect(isResourceAlreadyExistsError(failedWith('E0048'))).toBe(true);
    expect(isResourceAlreadyExistsError(failedWith('E0000'))).toBe(false);
    expect(isResourceAlreadyExistsError(new Error('network'))).toBe(false);
  });
});
