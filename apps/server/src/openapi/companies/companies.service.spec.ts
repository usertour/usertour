import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompaniesService } from './companies.service';
import { BizService } from '@/biz/biz.service';
import { ConfigService } from '@nestjs/config';
import { CompanyNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';
import { Prisma } from '@prisma/client';

describe('OpenAPICompaniesService', () => {
  let service: OpenAPICompaniesService;
  let mockBizService: jest.Mocked<BizService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPICompaniesService,
        {
          provide: BizService,
          useValue: {
            getBizCompany: jest.fn(),
            listBizCompanies: jest.fn(),
            deleteBizCompany: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAPICompaniesService>(OpenAPICompaniesService);
    mockBizService = module.get(BizService);
  });

  describe('getCompany', () => {
    it('should return company without expand', async () => {
      const mockBizCompany = {
        id: 'biz-company-1',
        externalId: 'company-1',
        data: {},
        createdAt: new Date('2025-04-27T10:56:52.198Z'),
        updatedAt: new Date('2025-04-27T10:56:52.198Z'),
        environmentId: 'env-1',
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

      mockBizService.getBizCompany.mockResolvedValue(mockBizCompany);

      const result = await service.getCompany('company-1', 'env-1');

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: {},
        createdAt: '2025-04-27T10:56:52.198Z',
        users: null,
        memberships: null,
      });
      expect(mockBizService.getBizCompany).toHaveBeenCalledWith('company-1', 'env-1', undefined);
    });

    it('should throw CompanyNotFoundError when company does not exist', async () => {
      mockBizService.getBizCompany.mockResolvedValue(null);

      await expect(service.getCompany('non-existent', 'env-1')).rejects.toThrow(
        CompanyNotFoundError,
      );
    });
  });

  describe('listCompanies', () => {
    it('should return paginated companies with default limit', async () => {
      const mockBizCompany = {
        id: 'biz-company-1',
        externalId: 'company-1',
        data: {},
        createdAt: new Date('2025-04-27T10:56:52.198Z'),
        updatedAt: new Date('2025-04-27T10:56:52.198Z'),
        environmentId: 'env-1',
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

      mockBizService.listBizCompanies.mockResolvedValue({
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
      });

      const result = await service.listCompanies('env-1');

      expect(result).toEqual({
        results: [
          {
            id: 'company-1',
            object: OpenApiObjectType.COMPANY,
            attributes: {},
            createdAt: '2025-04-27T10:56:52.198Z',
            users: null,
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      });
      expect(mockBizService.listBizCompanies).toHaveBeenCalledWith(
        'env-1',
        { first: 20 },
        { bizUsersOnCompany: { include: { bizUser: false } } },
      );
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      const mockBizCompany = {
        id: 'biz-company-1',
        externalId: 'company-1',
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        environmentId: 'env-1',
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

      mockBizService.getBizCompany.mockResolvedValue(mockBizCompany);
      mockBizService.deleteBizCompany.mockResolvedValue(undefined);

      await service.deleteCompany('company-1', 'env-1');

      expect(mockBizService.deleteBizCompany).toHaveBeenCalledWith(['biz-company-1'], 'env-1');
    });

    it('should throw CompanyNotFoundError when company does not exist', async () => {
      mockBizService.getBizCompany.mockResolvedValue(null);

      await expect(service.deleteCompany('non-existent', 'env-1')).rejects.toThrow(
        CompanyNotFoundError,
      );
    });
  });
});
