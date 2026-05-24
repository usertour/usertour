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
