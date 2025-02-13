import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Chance } from 'chance';
import { AppModule } from 'src/app.module';
import supertest from 'supertest';

const chance = new Chance();

describe('AppResolver (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('helloWorld (Query)', () => {
    // TODO assert return value
    return supertest(app.getHttpServer())
      .post('/graphql')
      .send({
        query: '{ helloWorld }',
      })
      .expect(200);
  });
  it('hello (Query)', () => {
    // TODO assert return value
    const name = chance.name();
    return supertest(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `{ hello(name: "${name}") }`,
      })
      .expect(200);
  });
});
