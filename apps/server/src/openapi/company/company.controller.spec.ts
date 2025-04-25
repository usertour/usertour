import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { UpsertCompanyRequestDto } from './company.dto';
import { OpenapiGuard } from '../openapi.guard';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { BizService } from '../../biz/biz.service';

describe('OpenAPI:CompanyController', () => {
  let controller: CompanyController;
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
    upsertBizCompanies: jest.fn(),
    upsertBizUsers: jest.fn(),
    deleteBizCompany: jest.fn(),
    upsertBizCompanyAttributes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        CompanyService,
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
        OpenapiGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
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

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockBizCompany);

      const result = await controller.getCompany('test-id', { environment: { id: 'env-1' } });

      expect(result).toEqual({
        id: 'test-id',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: createdAt.toISOString(),
        users: null,
        memberships: null,
      });
      expect(mockPrismaService.bizCompany.findFirst).toHaveBeenCalledWith({
        where: {
          externalId: 'test-id',
          environmentId: 'env-1',
        },
        include: {
          bizUsersOnCompany: false,
        },
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

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockBizCompany);

      const result = await controller.getCompany(
        'test-id',
        { environment: { id: 'env-1' } },
        'users',
      );

      expect(result).toEqual({
        id: 'test-id',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: createdAt.toISOString(),
        users: [
          {
            id: 'user-1',
            object: 'user',
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

      mockPrismaService.bizCompany.findMany.mockResolvedValue(mockBizCompanies);
      mockPrismaService.bizCompany.count.mockResolvedValue(1);

      const result = await controller.listCompanies(
        { environment: { id: 'env-1' } },
        undefined,
        20,
      );

      expect(result.results).toEqual([
        {
          id: 'test-id-1',
          object: 'company',
          attributes: { name: 'Company 1' },
          createdAt: createdAt.toISOString(),
          users: null,
          memberships: null,
        },
      ]);
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

      mockPrismaService.bizCompany.findMany
        .mockResolvedValueOnce([]) // Previous page
        .mockResolvedValueOnce(mockBizCompanies); // Current page
      mockPrismaService.bizCompany.count.mockResolvedValue(1);

      const result = await controller.listCompanies(
        { environment: { id: 'env-1' } },
        'current-cursor',
        10,
        'memberships.user',
      );

      expect(result.results).toEqual([
        {
          id: 'test-id-1',
          object: 'company',
          attributes: { name: 'Company 1' },
          createdAt: createdAt.toISOString(),
          users: null,
          memberships: [
            {
              id: 'membership-1',
              object: 'company_membership',
              attributes: { role: 'admin' },
              createdAt: createdAt.toISOString(),
              companyId: 'company-1',
              userId: 'user-1',
              user: {
                id: 'user-1',
                object: 'user',
                attributes: { name: 'Test User' },
                createdAt: createdAt.toISOString(),
              },
            },
          ],
        },
      ]);
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

      mockBizService.upsertBizCompanyAttributes.mockResolvedValue(mockBizCompany);

      const result = await controller.upsertCompany(mockRequest, { environment: { id: 'env-1' } });

      expect(result).toEqual({
        id: 'company-1',
        object: 'company',
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

      mockBizService.upsertBizCompanyAttributes.mockResolvedValue(mockBizCompany);

      const result = await controller.upsertCompany(mockRequest, { environment: { id: 'env-1' } });

      expect(result).toEqual({
        id: 'company-1',
        object: 'company',
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
        externalId: 'company-1',
        data: { name: 'Company 1' },
        createdAt,
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockBizCompany);
      mockBizService.deleteBizCompany.mockResolvedValue(undefined);

      await controller.deleteCompany('company-1', { environment: { id: 'env-1' } });

      expect(mockPrismaService.bizCompany.findFirst).toHaveBeenCalledWith({
        where: {
          externalId: 'company-1',
          environmentId: 'env-1',
        },
      });
      expect(mockBizService.deleteBizCompany).toHaveBeenCalled();
    });
  });
});
