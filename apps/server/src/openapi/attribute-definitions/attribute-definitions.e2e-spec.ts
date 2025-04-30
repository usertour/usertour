import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OpenApiObjectType } from '@/common/openapi/types';
import { OpenAPIModule } from '../openapi.module';
import { ConfigModule } from '@nestjs/config';
import { AttributesModule } from '@/attributes/attributes.module';
import { PrismaModule } from 'nestjs-prisma';
import { PrismaService } from 'nestjs-prisma';
import { ContentsModule } from '@/contents/contents.module';

describe('AttributeDefinitionsController (e2e)', () => {
  let app: INestApplication;
  const authToken = 'cm9tssy4h000aejz6ru55iibo';

  const mockPrismaService = {
    attribute: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        if (where.bizType === 1) {
          return [
            {
              id: 'attr1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              bizType: 1,
              projectId: 'test-project-id',
              displayName: 'Test User Attribute',
              codeName: 'test_user_attribute',
              description: 'Test user attribute',
              dataType: 1,
              randomMax: 0,
              predefined: false,
              deleted: false,
            },
          ];
        }
        if (where.bizType === 2) {
          return [
            {
              id: 'attr2',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              bizType: 2,
              projectId: 'test-project-id',
              displayName: 'Test Company Attribute',
              codeName: 'test_company_attribute',
              description: 'Test company attribute',
              dataType: 1,
              randomMax: 0,
              predefined: false,
              deleted: false,
            },
          ];
        }
        if (where.bizType === 3) {
          return [
            {
              id: 'attr3',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              bizType: 3,
              projectId: 'test-project-id',
              displayName: 'Test Company Membership Attribute',
              codeName: 'test_company_membership_attribute',
              description: 'Test company membership attribute',
              dataType: 1,
              randomMax: 0,
              predefined: false,
              deleted: false,
            },
          ];
        }
        if (where.bizType === 4) {
          return [
            {
              id: 'attr4',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              bizType: 4,
              projectId: 'test-project-id',
              displayName: 'Test Event Definition Attribute',
              codeName: 'test_event_definition_attribute',
              description: 'Test event definition attribute',
              dataType: 1,
              randomMax: 0,
              predefined: false,
              deleted: false,
            },
          ];
        }
        if (!where.bizType) {
          return [
            {
              id: 'attr1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              bizType: 1,
              projectId: 'test-project-id',
              displayName: 'Test User Attribute',
              codeName: 'test_user_attribute',
              description: 'Test user attribute',
              dataType: 1,
              randomMax: 0,
              predefined: false,
              deleted: false,
            },
          ];
        }
        return [];
      }),
      count: jest.fn().mockResolvedValue(1),
    },
    accessToken: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'token1',
        accessToken: 'cm9tssy4h000aejz6ru55iibo',
        isActive: true,
        environment: {
          id: 'env1',
          name: 'Test Environment',
          token: 'test-token',
          projectId: 'test-project-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PrismaModule.forRoot({
          isGlobal: true,
        }),
        AttributesModule,
        ContentsModule,
        OpenAPIModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/attribute-definitions', () => {
    it('should return user attributes when scope=user', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?scope=user')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.results[0].scope).toBe(OpenApiObjectType.USER);
        });
    });

    it('should return company attributes when scope=company', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?scope=company')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.results[0].scope).toBe(OpenApiObjectType.COMPANY);
        });
    });

    it('should return company membership attributes when scope=companyMembership', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?scope=companyMembership')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.results[0].scope).toBe(OpenApiObjectType.COMPANY_MEMBERSHIP);
        });
    });

    it('should return event definition attributes when scope=eventDefinition', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?scope=eventDefinition')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.results[0].scope).toBe(OpenApiObjectType.EVENT_DEFINITION);
        });
    });

    it('should return all attributes when no scope is specified', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.results)).toBe(true);
          expect(res.body.results.length).toBeGreaterThan(0);
        });
    });

    it('should handle invalid scope parameter', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?scope=invalid')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            error: {
              code: 'E1015',
              message: 'Invalid scope parameter',
              doc_url: 'https://docs.usertour.com',
            },
          });
        });
    });

    it('should support pagination with limit parameter', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?limit=2')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.results.length).toBeLessThanOrEqual(2);
        });
    });

    it('should support sorting with orderBy parameter', () => {
      return request(app.getHttpServer())
        .get('/v1/attribute-definitions?orderBy=-codeName')
        .set('Authorization', `Bearer ak_${authToken}`)
        .expect(200)
        .expect((res) => {
          const results = res.body.results;
          if (results.length > 1) {
            // Check if results are sorted in descending order by codeName
            for (let i = 0; i < results.length - 1; i++) {
              expect(
                results[i].codeName.localeCompare(results[i + 1].codeName),
              ).toBeGreaterThanOrEqual(0);
            }
          }
        });
    });
  });
});
