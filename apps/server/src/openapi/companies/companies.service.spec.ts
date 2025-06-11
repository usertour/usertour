import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompaniesService } from './companies.service';
import { BizService } from '@/biz/biz.service';
import { CompanyNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';
import { Prisma } from '@prisma/client';

describe('OpenAPICompaniesService', () => {
  let service: OpenAPICompaniesService;
  let bizService: jest.Mocked<BizService>;

  const mockEnvironment: Environment = {
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBizCompany = {
    id: '1',
    externalId: 'company-1',
    environmentId: 'env-1',
    data: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
    environment: {
      id: 'env-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Test Environment',
      token: 'test-token',
      deleted: false,
      projectId: 'project-1',
    },
    bizUsersOnCompany: [],
    bizUsers: [],
    bizCompaniesOnSegment: [],
    BizSession: [],
    _count: {
      environment: 1,
      bizUsersOnCompany: 0,
      bizUsers: 0,
      bizCompaniesOnSegment: 0,
      BizSession: 0,
    },
  } as unknown as Prisma.BizCompanyGetPayload<{
    include: {
      environment: true;
      _count: true;
      bizUsersOnCompany: true;
      bizUsers: true;
      bizCompaniesOnSegment: true;
      BizSession: true;
    };
  }>;

  beforeEach(async () => {
    const mockBizService = {
      getBizCompany: jest.fn(),
      listBizCompanies: jest.fn(),
      upsertBizCompany: jest.fn(),
      deleteBizCompany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPICompaniesService,
        {
          provide: BizService,
          useValue: mockBizService,
        },
      ],
    }).compile();

    service = module.get<OpenAPICompaniesService>(OpenAPICompaniesService);
    bizService = module.get(BizService);
  });

  describe('getCompany', () => {
    it('should return company when found', async () => {
      bizService.getBizCompany.mockResolvedValue(mockBizCompany);

      const result = await service.getCompany('company-1', mockEnvironment, {});

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: {},
        createdAt: expect.any(String),
        users: null,
        memberships: null,
      });
    });

    it('should throw error when company not found', async () => {
      bizService.getBizCompany.mockResolvedValue(null);

      await expect(service.getCompany('non-existent', mockEnvironment, {})).rejects.toThrow(
        new CompanyNotFoundError(),
      );
    });
  });

  describe('listCompanies', () => {
    it('should return paginated companies', async () => {
      const mockResponse = {
        edges: [
          {
            node: mockBizCompany,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
        nodes: [mockBizCompany],
        totalCount: 1,
      };

      bizService.listBizCompanies.mockResolvedValue(mockResponse);

      const result = await service.listCompanies(
        'http://localhost:3000/v1/companies',
        mockEnvironment,
        {},
      );

      expect(result).toEqual({
        results: [
          {
            id: 'company-1',
            object: OpenApiObjectType.COMPANY,
            attributes: {},
            createdAt: expect.any(String),
            users: null,
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      });
    });
  });

  describe('upsertCompany', () => {
    it('should upsert company', async () => {
      bizService.upsertBizCompany.mockResolvedValue(mockBizCompany);

      const mockData = {
        id: 'company-1',
        attributes: {},
      };

      const result = await service.upsertCompany(mockData, 'env-1', 'project-1');

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: {},
        createdAt: expect.any(String),
        users: null,
        memberships: null,
      });
    });
  });

  describe('deleteCompany', () => {
    it('should delete company', async () => {
      bizService.getBizCompany.mockResolvedValue(mockBizCompany);
      bizService.deleteBizCompany.mockResolvedValue({ count: 1 });

      const result = await service.deleteCompany('company-1', 'env-1');

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        deleted: true,
      });
      expect(bizService.getBizCompany).toHaveBeenCalledWith('company-1', 'env-1');
      expect(bizService.deleteBizCompany).toHaveBeenCalledWith(['1'], 'env-1');
    });
  });
});
