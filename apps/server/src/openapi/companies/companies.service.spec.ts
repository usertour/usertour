import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPICompaniesService } from './companies.service';
import { BizService } from '@/biz/biz.service';
import { ExpandType } from './companies.dto';
import { CompanyNotFoundError } from '@/common/errors/errors';
import { JsonValue } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';

describe('OpenAPICompaniesService', () => {
  let service: OpenAPICompaniesService;
  let mockBizService: jest.Mocked<BizService>;

  const mockCompany = {
    id: 'biz-1',
    externalId: 'company-1',
    environmentId: 'env-1',
    data: { name: 'Test Company' } as JsonValue,
    createdAt: new Date('2025-04-29T08:25:33.827Z'),
    updatedAt: new Date('2025-04-29T08:25:33.827Z'),
    deleted: false,
    bizUsersOnCompany: [],
  };

  const mockCompanyWithUsers = {
    ...mockCompany,
    bizUsersOnCompany: [
      {
        id: 'membership-1',
        createdAt: new Date('2025-04-29T08:25:33.827Z'),
        updatedAt: new Date('2025-04-29T08:25:33.827Z'),
        bizCompanyId: 'company-1',
        bizUserId: 'user-1',
        data: { role: 'admin' } as JsonValue,
        bizUser: {
          externalId: 'user-1',
          data: { name: 'Test User' } as JsonValue,
          createdAt: new Date('2025-04-29T08:25:33.827Z'),
          updatedAt: new Date('2025-04-29T08:25:33.827Z'),
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPICompaniesService,
        {
          provide: BizService,
          useValue: {
            getBizCompany: jest.fn(),
            listBizCompanies: jest.fn(),
            upsertBizCompany: jest.fn(),
            deleteBizCompany: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'app.apiUrl') {
                return 'http://localhost:3000';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAPICompaniesService>(OpenAPICompaniesService);
    mockBizService = module.get(BizService);
  });

  describe('getCompany', () => {
    it('should return company without expand', async () => {
      mockBizService.getBizCompany.mockResolvedValue(mockCompany);

      const result = await service.getCompany('company-1', 'env-1');

      expect(result).toEqual({
        id: 'company-1',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });

    it('should return company with users expand', async () => {
      mockBizService.getBizCompany.mockResolvedValue(mockCompanyWithUsers);

      const result = await service.getCompany('company-1', 'env-1', [ExpandType.USERS]);

      expect(result).toEqual({
        id: 'company-1',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: [
          {
            id: 'user-1',
            object: 'user',
            attributes: { name: 'Test User' },
            createdAt: mockCompanyWithUsers.bizUsersOnCompany[0].bizUser.createdAt.toISOString(),
          },
        ],
        memberships: null,
      });
    });

    it('should throw not found error when company does not exist', async () => {
      mockBizService.getBizCompany.mockResolvedValue(null);

      await expect(service.getCompany('non-existent', 'env-1')).rejects.toThrow(
        new CompanyNotFoundError(),
      );
    });
  });

  describe('listCompanies', () => {
    it('should return companies with pagination', async () => {
      mockBizService.listBizCompanies.mockResolvedValue({
        edges: [
          {
            node: mockCompany,
            cursor: 'cursor-1',
          },
        ],
        nodes: [mockCompany],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
          hasPreviousPage: true,
          startCursor: 'cursor-1',
        },
        totalCount: 1,
      });

      const result = await service.listCompanies('env-1', 20);

      expect(result).toEqual({
        results: [
          {
            id: 'company-1',
            object: 'company',
            attributes: { name: 'Test Company' },
            createdAt: mockCompany.createdAt.toISOString(),
            users: null,
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      });
    });

    it('should handle cursor pagination', async () => {
      mockBizService.listBizCompanies.mockResolvedValue({
        edges: [
          {
            node: mockCompany,
            cursor: 'cursor-2',
          },
        ],
        nodes: [mockCompany],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
          hasPreviousPage: true,
          startCursor: 'cursor-2',
        },
        totalCount: 1,
      });

      const result = await service.listCompanies('env-1', 20, 'cursor-1');

      expect(result).toEqual({
        results: [
          {
            id: 'company-1',
            object: 'company',
            attributes: { name: 'Test Company' },
            createdAt: mockCompany.createdAt.toISOString(),
            users: null,
            memberships: null,
          },
        ],
        next: null,
        previous: 'http://localhost:3000/v1/companies?limit=20',
      });

      expect(mockBizService.listBizCompanies).toHaveBeenCalledWith(
        'env-1',
        {
          first: 20,
          after: 'cursor-1',
        },
        {
          bizUsersOnCompany: {
            include: {
              bizUser: false,
            },
          },
        },
      );
    });

    it('should handle expand parameter', async () => {
      mockBizService.listBizCompanies.mockResolvedValue({
        edges: [
          {
            node: mockCompanyWithUsers,
            cursor: 'cursor-1',
          },
        ],
        nodes: [mockCompanyWithUsers],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
          hasPreviousPage: true,
          startCursor: 'cursor-1',
        },
        totalCount: 1,
      });

      const result = await service.listCompanies('env-1', 20, undefined, [
        ExpandType.MEMBERSHIPS_USER,
      ]);

      expect(result).toEqual({
        results: [
          {
            id: 'company-1',
            object: 'company',
            attributes: { name: 'Test Company' },
            createdAt: mockCompany.createdAt.toISOString(),
            users: null,
            memberships: [
              {
                id: 'membership-1',
                object: 'company_membership',
                attributes: { role: 'admin' },
                createdAt: mockCompanyWithUsers.bizUsersOnCompany[0].createdAt.toISOString(),
                companyId: 'company-1',
                userId: 'user-1',
                user: {
                  id: 'user-1',
                  object: 'user',
                  attributes: { name: 'Test User' },
                  createdAt:
                    mockCompanyWithUsers.bizUsersOnCompany[0].bizUser.createdAt.toISOString(),
                },
              },
            ],
          },
        ],
        next: null,
        previous: null,
      });
    });
  });

  describe('upsertCompany', () => {
    it('should create a new company', async () => {
      mockBizService.upsertBizCompany.mockResolvedValue(mockCompany);

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
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });

    it('should throw not found error when company creation fails', async () => {
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
      ).rejects.toThrow(new CompanyNotFoundError());
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      mockBizService.getBizCompany.mockResolvedValue(mockCompany);
      mockBizService.deleteBizCompany.mockResolvedValue(undefined);

      await service.deleteCompany('company-1', 'env-1');

      expect(mockBizService.deleteBizCompany).toHaveBeenCalledWith(['biz-1'], 'env-1');
    });

    it('should throw not found error when company does not exist', async () => {
      mockBizService.getBizCompany.mockResolvedValue(null);

      await expect(service.deleteCompany('non-existent', 'env-1')).rejects.toThrow(
        new CompanyNotFoundError(),
      );
    });
  });
});
