import { INestApplication } from '@nestjs/common';

import { graphql } from '../auth';
import { createTestApp } from '../create-test-app';

/**
 * A document the schema rejects answers with `GRAPHQL_VALIDATION_FAILED` and
 * a masked message. The dashboard's error link reloads the tab on that code:
 * every build validates its documents against the schema it was built from,
 * so the code only ever means a stale build is talking to a newer server.
 * The formatter masks every other unknown error, so this pins the exception.
 */
describe('GraphQL document validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('a variable declared as a type the argument no longer takes', async () => {
    // The shape of a stale build: an older document declaring the variable
    // as the base type after the server renamed the scalar.
    const res = await graphql(app, {
      query: 'query($b:Int!,$p:String!){listAttributes(bizType:$b,projectId:$p){__typename}}',
      variables: { b: 1, p: 'project' },
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(res.body.errors[0].message).toBe('Bad Request');
  });

  it('a selection the schema does not have', async () => {
    const res = await graphql(app, {
      query: 'query{listAttributes(bizType:1,projectId:"project"){noSuchField}}',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(res.body.errors[0].message).toBe('Bad Request');
  });
});
