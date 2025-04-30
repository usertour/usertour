import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompaniesController } from './companies.controller';
import { OpenAPICompaniesService } from './companies.service';
import { UpsertCompanyRequestDto, ExpandType } from './companies.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { BizService } from '@/biz/biz.service';
import { Environment } from '@/environments/models/environment.model';
import { OpenApiObjectType } from '@/common/types/openapi';
describe('OpenAPICompaniesController', () => {
  let controller: OpenAPICompaniesController;
  const createdAt = new Date();

  const mockPrismaService = {
    bizCompany: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    environment: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'env-1',
        projectId: 'project-1',
      }),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockBizService = {
    getBizCompany: jest.fn(),
    listBizCompanies: jest.fn(),
    upsertBizCompany: jest.fn(),
    deleteBizCompany: jest.fn(),
  };

  const mockEnvironment: Environment = {
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPICompaniesController],
      providers: [
        OpenAPICompaniesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'app.docUrl':
                  return 'https://docs.usertour.com';
                case 'app.apiUrl':
                  return 'http://localhost:3000';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: BizService,
          useValue: mockBizService,
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPICompaniesController>(OpenAPICompaniesController);
    jest.clearAllMocks();
  });

  describe('getCompany', () => {
    it('should return a company without expand', async () => {
      const mockBizCompany = {
        externalId: 'test-id',
        data: { name: 'Test Company' },
        createdAt,
        bizUsersOnCompany: [],
      };

      mockBizService.getBizCompany.mockResolvedValue(mockBizCompany);

      const result = await controller.getCompany(mockEnvironment, 'test-id');

      expect(result).toEqual({
        id: 'test-id',
        object: OpenApiObjectType.COMPANY,
        attributes: { name: 'Test Company' },
        createdAt: createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });

    it('should return a company with expand parameters', async () => {
      const mockBizCompany = {
        externalId: 'test-id',
        data: { name: 'Test Company' },
        createdAt,
        bizUsersOnCompany: [
          {
            bizUser: {
              externalId: 'user-1',
              data: { name: 'Test User' },
              createdAt,
            },
          },
        ],
      };

      mockBizService.getBizCompany.mockResolvedValue(mockBizCompany);

      const result = await controller.getCompany(mockEnvironment, 'test-id', [ExpandType.USERS]);

      expect(result).toEqual({
        id: 'test-id',
        object: OpenApiObjectType.COMPANY,
        attributes: { name: 'Test Company' },
        createdAt: createdAt.toISOString(),
        users: [
          {
            id: 'user-1',
            object: OpenApiObjectType.USER,
            attributes: { name: 'Test User' },
            createdAt: createdAt.toISOString(),
          },
        ],
        memberships: null,
      });
    });
  });

  describe('listCompanies', () => {
    it('should return paginated companies without expand', async () => {
      const mockBizCompanies = [
        {
          externalId: 'test-id-1',
          data: { name: 'Company 1' },
          createdAt,
          bizUsersOnCompany: [],
        },
      ];

      mockBizService.listBizCompanies.mockResolvedValue({
        edges: mockBizCompanies.map((company) => ({
          node: company,
          cursor: 'cursor-1',
        })),
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
          hasPreviousPage: false,
          startCursor: null,
        },
      });

      const result = await controller.listCompanies(mockEnvironment, undefined, '20');

      expect(result.results).toEqual([
        {
          id: 'test-id-1',
          object: OpenApiObjectType.COMPANY,
          attributes: { name: 'Company 1' },
          createdAt: createdAt.toISOString(),
          users: null,
          memberships: null,
        },
      ]);
      expect(result.next).toBe(null);
      expect(result.previous).toBe('http://localhost:3000/v1/companies?limit=20');
    });

    it('should return paginated companies with expand and cursor', async () => {
      const mockBizCompanies = [
        {
          externalId: 'test-id-1',
          data: { name: 'Company 1' },
          createdAt,
          bizUsersOnCompany: [
            {
              id: 'membership-1',
              data: { role: 'admin' },
              createdAt,
              bizCompanyId: 'company-1',
              bizUserId: 'user-1',
              bizUser: {
                externalId: 'user-1',
                data: { name: 'Test User' },
                createdAt,
              },
            },
          ],
        },
      ];

      mockBizService.listBizCompanies.mockResolvedValue({
        edges: mockBizCompanies.map((company) => ({
          node: company,
          cursor: 'cursor-1',
        })),
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
          hasPreviousPage: false,
          startCursor: null,
        },
        nodes: mockBizCompanies,
        totalCount: 1,
      });

      const result = await controller.listCompanies(mockEnvironment, 10, 'current-cursor', [
        ExpandType.MEMBERSHIPS,
        ExpandType.USERS,
      ]);

      expect(result.results).toEqual([
        {
          id: 'test-id-1',
          object: OpenApiObjectType.COMPANY,
          attributes: { name: 'Company 1' },
          createdAt: createdAt.toISOString(),
          users: [
            {
              id: 'user-1',
              object: OpenApiObjectType.USER,
              attributes: { name: 'Test User' },
              createdAt: createdAt.toISOString(),
            },
          ],
          memberships: [
            {
              id: 'membership-1',
              object: OpenApiObjectType.COMPANY_MEMBERSHIP,
              attributes: { role: 'admin' },
              createdAt: createdAt.toISOString(),
              companyId: 'company-1',
              userId: 'user-1',
              user: undefined,
            },
          ],
        },
      ]);
      expect(result.next).toBe(null);
      expect(result.previous).toBe('http://localhost:3000/v1/companies?limit=10');
    });
  });

  describe('upsertCompany', () => {
    it('should create a new company', async () => {
      const mockRequest: UpsertCompanyRequestDto = {
        id: 'company-1',
        attributes: { name: 'New Company', industry: 'Technology' },
      };

      const mockBizCompany = {
        externalId: 'company-1',
        data: { name: 'New Company', industry: 'Technology' },
        createdAt,
        bizUsersOnCompany: [],
      };

      mockBizService.upsertBizCompany.mockResolvedValue(mockBizCompany);

      const result = await controller.upsertCompany(mockEnvironment, mockRequest);

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: { name: 'New Company', industry: 'Technology' },
        createdAt: createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });

    it('should update an existing company', async () => {
      const mockRequest: UpsertCompanyRequestDto = {
        id: 'company-1',
        attributes: { name: 'Updated Company', industry: 'Technology', size: 'Large' },
      };

      const mockBizCompany = {
        externalId: 'company-1',
        data: { name: 'Updated Company', industry: 'Technology', size: 'Large' },
        createdAt,
        bizUsersOnCompany: [],
      };

      mockBizService.upsertBizCompany.mockResolvedValue(mockBizCompany);

      const result = await controller.upsertCompany(mockEnvironment, mockRequest);

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: { name: 'Updated Company', industry: 'Technology', size: 'Large' },
        createdAt: createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });
  });

  describe('deleteCompany', () => {
    it('should delete a company', async () => {
      const mockBizCompany = {
        id: 'biz1',
        externalId: 'company-1',
        data: { name: 'Company 1' },
        createdAt,
        bizUsersOnCompany: [],
      };

      mockBizService.getBizCompany.mockResolvedValue(mockBizCompany);
      mockBizService.deleteBizCompany.mockResolvedValue(undefined);

      await controller.deleteCompany(mockEnvironment, 'company-1');

      expect(mockBizService.getBizCompany).toHaveBeenCalledWith('company-1', 'env-1');
      expect(mockBizService.deleteBizCompany).toHaveBeenCalledWith(['biz1'], 'env-1');
    });
  });
});
