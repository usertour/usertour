import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLError } from 'graphql';
import {
  InstanceLicenseRequiredError,
  ParamsError,
  UnknownError,
} from '@/modules/common/errors/errors';
import { GqlConfigService } from './gql-config.service';

// formatError is the one place every GraphQL failure passes through, so it is
// also where "the client was refused" and "the server failed" part ways in
// the log. The response is built first and its code picks the line: a
// refusal is a single warning carrying what the client sees, a failure keeps
// the full error.

describe('GqlConfigService.formatError logging', () => {
  const build = () => {
    const service = new GqlConfigService({
      get: () => ({ debug: false }),
    } as unknown as ConfigService);
    const logger = { warn: jest.fn(), error: jest.fn() };
    Object.assign(service, { logger });
    const formatError = service.createGqlOptions().formatError;
    if (!formatError) {
      throw new Error('formatError is not configured');
    }
    return { formatError, logger };
  };

  const path = ['updateProjectUsesInstanceLicense'];
  const wrap = (originalError: Error) =>
    new GraphQLError(originalError.message, { originalError, path });

  it('logs a catalogued refusal once, as a warning without the error object', () => {
    const { formatError, logger } = build();
    const error = wrap(new InstanceLicenseRequiredError());

    const formatted = formatError({ message: error.message }, error);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchObject({ code: 'E0064', path });
    expect(logger.warn.mock.calls[0][0]).not.toHaveProperty('err');
    expect(logger.error).not.toHaveBeenCalled();
    expect(formatted.extensions?.code).toBe('E0064');
  });

  it('logs a pipe rejection as a warning with the code and the reason the client receives', () => {
    const { formatError, logger } = build();
    const error = wrap(new BadRequestException(['name must be a string']));

    const formatted = formatError({ message: error.message }, error);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchObject({
      code: 'E1017',
      reason: 'name must be a string',
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(formatted.extensions).toMatchObject({ code: 'E1017', reason: 'name must be a string' });
  });

  it('logs a variable the schema rejects as a warning with the engine text as the reason', () => {
    const { formatError, logger } = build();
    const error = new GraphQLError('Variable "$input" got invalid value null at "input.name"', {
      extensions: { code: 'BAD_USER_INPUT' },
    });

    const formatted = formatError(
      { message: error.message, extensions: { code: 'BAD_USER_INPUT' } },
      error,
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchObject({ code: 'E1017', reason: error.message });
    expect(logger.error).not.toHaveBeenCalled();
    expect(formatted.extensions).toMatchObject({ code: 'E1017', reason: error.message });
  });

  it('logs a stale-build document rejection as a warning', () => {
    const { formatError, logger } = build();
    const error = new GraphQLError('Unknown type "Foo"', {
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    });

    const formatted = formatError(
      { message: error.message, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } },
      error,
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchObject({ code: 'GRAPHQL_VALIDATION_FAILED' });
    expect(logger.error).not.toHaveBeenCalled();
    expect(formatted.extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED');
  });

  it('keeps a bare ParamsError at error level, since only the error locates it', () => {
    const { formatError, logger } = build();
    const error = wrap(new ParamsError());

    const formatted = formatError({ message: error.message }, error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toHaveProperty('err', error);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(formatted.extensions?.code).toBe('E0003');
  });

  it('keeps E0000 at error level with the error attached', () => {
    const { formatError, logger } = build();
    const error = wrap(new UnknownError());

    formatError({ message: error.message }, error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toHaveProperty('err', error);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs an unexpected error exactly once', () => {
    const { formatError, logger } = build();
    const error = wrap(new TypeError('Cannot read properties of undefined'));

    const formatted = formatError({ message: error.message }, error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(formatted.message).toBe('Internal Server Error');
  });
});
