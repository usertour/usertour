import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Chance } from 'chance';
import { AppModule } from 'src/app.module';
import supertest from 'supertest';

const chance = new Chance();

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return supertest(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('/hello/:name (GET)', () => {
    const name = chance.name();
    return supertest(app.getHttpServer())
      .get(`/hello/${name}`)
      .expect(200)
      .expect(`Hello ${name}!`);
  });
});
