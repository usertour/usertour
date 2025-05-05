import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompaniesService } from './companies.service';
import { BizService } from '@/biz/biz.service';
import { ConfigService } from '@nestjs/config';
import { CompanyNotFoundError, InvalidOrderByError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Prisma } from '@prisma/client';
import { ExpandType } from './companies.dto';

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
            upsertBizCompany: jest.fn(),
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
        data: { name: 'Test Company' },
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
        attributes: { name: 'Test Company' },
        createdAt: '2025-04-27T10:56:52.198Z',
        users: null,
        memberships: null,
      });
      expect(mockBizService.getBizCompany).toHaveBeenCalledWith('company-1', 'env-1', undefined);
    });

    it('should return company with expand users', async () => {
      const mockBizCompany = {
        id: 'biz-company-1',
        externalId: 'company-1',
        data: { name: 'Test Company' },
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
        bizUsersOnCompany: [
          {
            id: 'membership-1',
            createdAt: new Date('2025-04-27T10:56:52.198Z'),
            updatedAt: new Date('2025-04-27T10:56:52.198Z'),
            bizCompanyId: 'biz-company-1',
            bizUserId: 'user-1',
            data: { role: 'admin' },
            bizUser: {
              id: 'user-1',
              externalId: 'user-1',
              data: { name: 'Test User' },
              createdAt: new Date('2025-04-27T10:56:52.198Z'),
            },
          },
        ],
        bizUsers: [],
        bizCompaniesOnSegment: [],
        BizSession: [],
        _count: {
          environment: 1,
          bizUsersOnCompany: 1,
          bizUsers: 0,
          bizCompaniesOnSegment: 0,
          BizSession: 0,
        },
      } as unknown as Prisma.BizCompanyGetPayload<{
        include: {
          environment: true;
          _count: true;
          bizUsersOnCompany: {
            include: {
              bizUser: true;
            };
          };
          bizUsers: true;
          bizCompaniesOnSegment: true;
          BizSession: true;
        };
      }>;

      mockBizService.getBizCompany.mockResolvedValue(mockBizCompany);

      const result = await service.getCompany('company-1', 'env-1', [ExpandType.USERS]);

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: { name: 'Test Company' },
        createdAt: '2025-04-27T10:56:52.198Z',
        users: [
          {
            id: 'user-1',
            object: OpenApiObjectType.USER,
            attributes: { name: 'Test User' },
            createdAt: '2025-04-27T10:56:52.198Z',
          },
        ],
        memberships: null,
      });
      expect(mockBizService.getBizCompany).toHaveBeenCalledWith('company-1', 'env-1', [
        ExpandType.USERS,
      ]);
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
        data: { name: 'Test Company' },
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

      const result = await service.listCompanies('http://localhost:3000/v1/companies', {
        id: 'env-1',
        projectId: 'project-1',
        name: 'Test Environment',
        token: 'test-token',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result).toEqual({
        results: [
          {
            id: 'company-1',
            object: OpenApiObjectType.COMPANY,
            attributes: { name: 'Test Company' },
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
        { bizUsersOnCompany: { include: { bizUser: undefined } } },
        [{ createdAt: 'asc' }],
      );
    });

    it('should throw InvalidOrderByError for invalid orderBy field', async () => {
      await expect(
        service.listCompanies(
          'http://localhost:3000/v1/companies',
          {
            id: 'env-1',
            projectId: 'project-1',
            name: 'Test Environment',
            token: 'test-token',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          20,
          undefined,
          undefined,
          ['invalidField' as any],
        ),
      ).rejects.toThrow(InvalidOrderByError);
    });
  });

  describe('upsertCompany', () => {
    it('should create or update a company', async () => {
      const mockBizCompany = {
        id: 'biz-company-1',
        externalId: 'company-1',
        data: { name: 'Test Company' },
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

      mockBizService.upsertBizCompany.mockResolvedValue(mockBizCompany);

      const result = await service.upsertCompany(
        {
          id: 'company-1',
          attributes: { name: 'Test Company' },
        },
        'env-1',
        'project-1',
      );

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        attributes: { name: 'Test Company' },
        createdAt: '2025-04-27T10:56:52.198Z',
        users: null,
        memberships: null,
      });
      expect(mockBizService.upsertBizCompany).toHaveBeenCalledWith(
        'project-1',
        'env-1',
        'company-1',
        { name: 'Test Company' },
      );
    });

    it('should throw CompanyNotFoundError when upsert fails', async () => {
      mockBizService.upsertBizCompany.mockResolvedValue(null);

      await expect(
        service.upsertCompany(
          {
            id: 'company-1',
            attributes: { name: 'Test Company' },
          },
          'env-1',
          'project-1',
        ),
      ).rejects.toThrow(CompanyNotFoundError);
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      const mockBizCompany = {
        id: 'biz-company-1',
        externalId: 'company-1',
        data: { name: 'Test Company' },
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

      const result = await service.deleteCompany('company-1', 'env-1');

      expect(result).toEqual({
        id: 'company-1',
        object: OpenApiObjectType.COMPANY,
        deleted: true,
      });
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
