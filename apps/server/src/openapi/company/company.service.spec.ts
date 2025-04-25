import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { BizService } from '../../biz/biz.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { UpsertCompanyRequestDto, ExpandType } from './company.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';

describe('OpenAPI:CompanyService', () => {
  let service: CompanyService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    bizCompany: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    environment: {
      findFirst: jest.fn(),
    },
  };

  const mockBizService = {
    upsertBizCompanyAttributes: jest.fn(),
    deleteBizCompany: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BizService,
          useValue: mockBizService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  describe('upsertCompany', () => {
    it('should create a new company', async () => {
      const data: UpsertCompanyRequestDto = {
        id: 'company1',
        attributes: { name: 'Test Company', industry: 'Technology' },
      };

      const mockEnvironment = {
        projectId: 'project1',
      };

      const mockCompany = {
        id: 'biz1',
        externalId: 'company1',
        data: { name: 'Test Company', industry: 'Technology' },
        environmentId: 'env1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.environment.findFirst.mockResolvedValue(mockEnvironment);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizCompanyAttributes.mockResolvedValue(mockCompany);

      const result = await service.upsertCompany(data, 'env1');

      expect(result).toEqual({
        id: 'company1',
        object: 'company',
        attributes: { name: 'Test Company', industry: 'Technology' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: null,
        memberships: null,
      });

      expect(mockBizService.upsertBizCompanyAttributes).toHaveBeenCalledWith(
        mockPrismaService,
        'project1',
        'env1',
        'company1',
        data.attributes,
      );
    });

    it('should throw error when environment is not found', async () => {
      const data: UpsertCompanyRequestDto = {
        id: 'company1',
        attributes: { name: 'Test Company' },
      };

      mockPrismaService.environment.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      await expect(service.upsertCompany(data, 'env1')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.COMPANY.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.COMPANY.INVALID_REQUEST.code,
        ),
      );
    });
  });

  describe('getCompany', () => {
    it('should return company with no expand', async () => {
      const mockCompany = {
        externalId: 'test-id',
        data: { name: 'Test Company' },
        createdAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockCompany);

      const result = await service.getCompany('test-id', 'env-id');

      expect(result).toEqual({
        id: 'test-id',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });

    it('should return company with users expand', async () => {
      const mockCompany = {
        externalId: 'test-id',
        data: { name: 'Test Company' },
        createdAt: new Date(),
        bizUsersOnCompany: [
          {
            bizUser: {
              externalId: 'user-1',
              data: { name: 'Test User' },
              createdAt: new Date(),
            },
          },
        ],
      };

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockCompany);

      const result = await service.getCompany('test-id', 'env-id', [ExpandType.USERS]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: [
          {
            id: 'user-1',
            object: 'user',
            attributes: { name: 'Test User' },
            createdAt: mockCompany.bizUsersOnCompany[0].bizUser.createdAt.toISOString(),
          },
        ],
        memberships: null,
      });
    });

    it('should return company with memberships expand', async () => {
      const mockCompany = {
        externalId: 'test-id',
        data: { name: 'Test Company' },
        createdAt: new Date(),
        bizUsersOnCompany: [
          {
            id: 'membership-1',
            data: { role: 'admin' },
            createdAt: new Date(),
            bizCompanyId: 'company-1',
            bizUserId: 'user-1',
          },
        ],
      };

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockCompany);

      const result = await service.getCompany('test-id', 'env-id', [ExpandType.MEMBERSHIPS]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'company',
        attributes: { name: 'Test Company' },
        createdAt: mockCompany.createdAt.toISOString(),
        users: null,
        memberships: [
          {
            id: 'membership-1',
            object: 'company_membership',
            attributes: { role: 'admin' },
            created_at: mockCompany.bizUsersOnCompany[0].createdAt.toISOString(),
            groupId: 'company-1',
            userId: 'user-1',
          },
        ],
      });
    });

    it('should throw not found error when company does not exist', async () => {
      mockPrismaService.bizCompany.findFirst.mockResolvedValue(null);

      await expect(service.getCompany('non-existent', 'env-id')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.COMPANY.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.COMPANY.NOT_FOUND.code,
        ),
      );
    });
  });

  describe('listCompanies', () => {
    it('should return paginated companies with no expand', async () => {
      const mockCompanies = [
        {
          externalId: 'test-id-1',
          data: { name: 'Company 1' },
          createdAt: new Date(),
          bizUsersOnCompany: [],
        },
        {
          externalId: 'test-id-2',
          data: { name: 'Company 2' },
          createdAt: new Date(),
          bizUsersOnCompany: [],
        },
      ];

      mockPrismaService.bizCompany.findMany.mockResolvedValue(mockCompanies);
      mockPrismaService.bizCompany.count.mockResolvedValue(2);

      const result = await service.listCompanies('env-id', undefined, 2);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        id: 'test-id-1',
        object: 'company',
        attributes: { name: 'Company 1' },
        createdAt: mockCompanies[0].createdAt.toISOString(),
        users: null,
        memberships: null,
      });
    });

    it('should return paginated companies with memberships.user expand', async () => {
      const mockCompanies = [
        {
          externalId: 'test-id-1',
          data: { name: 'Company 1' },
          createdAt: new Date(),
          bizUsersOnCompany: [
            {
              id: 'membership-1',
              data: { role: 'admin' },
              createdAt: new Date(),
              bizCompanyId: 'company-1',
              bizUserId: 'user-1',
              bizUser: {
                externalId: 'user-1',
                data: { name: 'Test User' },
                createdAt: new Date(),
              },
            },
          ],
        },
      ];

      mockPrismaService.bizCompany.findMany.mockResolvedValue(mockCompanies);
      mockPrismaService.bizCompany.count.mockResolvedValue(1);

      const result = await service.listCompanies('env-id', undefined, 1, [
        ExpandType.MEMBERSHIPS_USER,
      ]);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].memberships).toEqual([
        {
          id: 'membership-1',
          object: 'company_membership',
          attributes: { role: 'admin' },
          created_at: mockCompanies[0].bizUsersOnCompany[0].createdAt.toISOString(),
          groupId: 'company-1',
          userId: 'user-1',
          user: {
            id: 'user-1',
            object: 'user',
            attributes: { name: 'Test User' },
            createdAt: mockCompanies[0].bizUsersOnCompany[0].bizUser.createdAt.toISOString(),
          },
        },
      ]);
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      const mockCompany = {
        id: 'biz1',
        externalId: 'company1',
        environmentId: 'env1',
      };

      mockPrismaService.bizCompany.findFirst.mockResolvedValue(mockCompany);
      mockBizService.deleteBizCompany.mockResolvedValue({});

      await service.deleteCompany('company1', 'env1');

      expect(mockBizService.deleteBizCompany).toHaveBeenCalledWith(['biz1'], 'env1');
    });

    it('should throw error when company not found', async () => {
      mockPrismaService.bizCompany.findFirst.mockResolvedValue(null);

      await expect(service.deleteCompany('non-existent', 'env1')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.COMPANY.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.COMPANY.NOT_FOUND.code,
        ),
      );
    });
  });
});
