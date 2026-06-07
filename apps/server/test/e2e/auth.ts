import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

/** Sign an access token for a user id, using the app's own JWT config. */
export const signToken = (app: INestApplication, userId: string): string =>
  app.get(JwtService).sign({ userId });

/** Fire a GraphQL operation over HTTP, optionally authenticated as a user. */
export const graphql = (
  app: INestApplication,
  opts: { query: string; variables?: Record<string, any>; token?: string },
) => {
  const req = request(app.getHttpServer()).post('/graphql');
  if (opts.token) {
    req.set('Authorization', `Bearer ${opts.token}`);
  }
  return req.send({ query: opts.query, variables: opts.variables ?? {} });
};

/** NoPermissionError surfaces in the GraphQL response with this extensions code. */
export const NO_PERMISSION_CODE = 'E0013';

export const isPermissionDenied = (res: { body?: any }): boolean =>
  (res.body?.errors ?? []).some((e: any) => e?.extensions?.code === NO_PERMISSION_CODE);

/**
 * Assert a GraphQL response carries no errors and return its `data`. Fails loud
 * (throws with the error payload) so a broken mutation/query surfaces clearly
 * instead of a confusing `undefined` later in the test.
 */
export const gqlData = (res: { body?: any }): any => {
  const errors = res.body?.errors;
  if (errors?.length) {
    throw new Error(`Unexpected GraphQL errors: ${JSON.stringify(errors, null, 2)}`);
  }
  return res.body?.data;
};

/** First GraphQL error's `extensions.code` — for asserting error cases. */
export const gqlErrorCode = (res: { body?: any }): string | undefined =>
  res.body?.errors?.[0]?.extensions?.code;
