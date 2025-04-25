import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { BizService } from '../../biz/biz.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { UpsertUserRequestDto, ExpandType } from './user.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';

describe('OpenAPI:UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    bizUser: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockBizService = {
    upsertBizUsers: jest.fn(),
    upsertBizCompanies: jest.fn(),
    deleteBizUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
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

    service = module.get<UserService>(UserService);
  });

  describe('upsertUser', () => {
    it('should throw error when both companies and memberships are provided', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        companies: [{ id: 'company1', attributes: { name: 'Test Company' } }],
        memberships: [
          {
            attributes: { role: 'admin' },
            company: { id: 'company1', attributes: { name: 'Test Company' } },
          },
        ],
      };

      const error = new OpenAPIException(
        OpenAPIErrors.USER.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_REQUEST.code,
      );

      await expect(service.upsertUser(data, 'env1')).rejects.toThrow(error);
    });

    it('should create user with companies', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        companies: [{ id: 'company1', attributes: { name: 'Test Company' } }],
      };

      const mockUser = {
        id: 'user1',
        externalId: 'user1',
        data: { name: 'Test User' },
        environmentId: 'env1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizUsers.mockResolvedValue(mockUser);
      mockBizService.upsertBizCompanies.mockResolvedValue({});

      await service.upsertUser(data, 'env1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockBizService.upsertBizUsers).toHaveBeenCalledWith(
        mockPrismaService,
        'user1',
        data.attributes,
        'env1',
      );
      expect(mockBizService.upsertBizCompanies).toHaveBeenCalledWith(
        mockPrismaService,
        'company1',
        'user1',
        data.companies[0].attributes,
        'env1',
        {},
      );
    });

    it('should create user with memberships', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        memberships: [
          {
            attributes: { role: 'admin' },
            company: { id: 'company1', attributes: { name: 'Test Company' } },
          },
        ],
      };

      const mockUser = {
        id: 'user1',
        externalId: 'user1',
        data: { name: 'Test User' },
        environmentId: 'env1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizUsers.mockResolvedValue(mockUser);
      mockBizService.upsertBizCompanies.mockResolvedValue({});

      await service.upsertUser(data, 'env1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockBizService.upsertBizUsers).toHaveBeenCalledWith(
        mockPrismaService,
        'user1',
        data.attributes,
        'env1',
      );
      expect(mockBizService.upsertBizCompanies).toHaveBeenCalledWith(
        mockPrismaService,
        'company1',
        'user1',
        data.memberships[0].company.attributes,
        'env1',
        data.memberships[0].attributes,
      );
    });

    it('should throw error when user creation fails', async () => {
      const data: UpsertUserRequestDto = {
        id: 'user1',
        attributes: { name: 'Test User' },
        companies: [{ id: 'company1', attributes: { name: 'Test Company' } }],
      };

      const error = new OpenAPIException(
        OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
        OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.code,
      );

      mockPrismaService.bizUser.findFirst.mockRejectedValue(error);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockBizService.upsertBizUsers.mockRejectedValue(error);

      await expect(service.upsertUser(data, 'env1')).rejects.toThrow(error);
    });
  });

  describe('getUser', () => {
    it('should return user with no expand', async () => {
      const mockUser = {
        externalId: 'test-id',
        data: { name: 'Test User' },
        createdAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUser('test-id', 'env-id');

      expect(result).toEqual({
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: mockUser.createdAt.toISOString(),
        companies: null,
        memberships: null,
      });
    });

    it('should return user with companies expand', async () => {
      const mockUser = {
        externalId: 'test-id',
        data: { name: 'Test User' },
        createdAt: new Date(),
        bizUsersOnCompany: [
          {
            bizCompany: {
              externalId: 'company-1',
              data: { name: 'company 1' },
              createdAt: new Date(),
            },
          },
        ],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUser('test-id', 'env-id', [ExpandType.COMPANIES]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: mockUser.createdAt.toISOString(),
        companies: [
          {
            id: 'company-1',
            object: 'company',
            attributes: { name: 'company 1' },
            createdAt: mockUser.bizUsersOnCompany[0].bizCompany.createdAt.toISOString(),
          },
        ],
        memberships: null,
      });
    });

    it('should return user with memberships expand', async () => {
      const mockUser = {
        externalId: 'test-id',
        data: { name: 'Test User' },
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

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUser('test-id', 'env-id', [ExpandType.MEMBERSHIPS]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: mockUser.createdAt.toISOString(),
        companies: null,
        memberships: [
          {
            id: 'membership-1',
            object: 'company_membership',
            attributes: { role: 'admin' },
            createdAt: mockUser.bizUsersOnCompany[0].createdAt.toISOString(),
            companyId: 'company-1',
            userId: 'user-1',
          },
        ],
      });
    });

    it('should return user with memberships.company expand', async () => {
      const mockUser = {
        externalId: 'test-id',
        data: { name: 'Test User' },
        createdAt: new Date(),
        bizUsersOnCompany: [
          {
            id: 'membership-1',
            data: { role: 'admin' },
            createdAt: new Date(),
            bizCompanyId: 'company-1',
            bizUserId: 'user-1',
            bizCompany: {
              externalId: 'company-1',
              data: { name: 'company 1' },
              createdAt: new Date(),
            },
          },
        ],
      };

      mockPrismaService.bizUser.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUser('test-id', 'env-id', [ExpandType.MEMBERSHIPS_COMPANY]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: mockUser.createdAt.toISOString(),
        companies: null,
        memberships: [
          {
            id: 'membership-1',
            object: 'company_membership',
            attributes: { role: 'admin' },
            createdAt: mockUser.bizUsersOnCompany[0].createdAt.toISOString(),
            companyId: 'company-1',
            userId: 'user-1',
            company: {
              id: 'company-1',
              object: 'company',
              attributes: { name: 'company 1' },
              createdAt: mockUser.bizUsersOnCompany[0].bizCompany.createdAt.toISOString(),
            },
          },
        ],
      });
    });

    it('should throw not found error when user does not exist', async () => {
      mockPrismaService.bizUser.findFirst.mockResolvedValue(null);

      await expect(service.getUser('non-existent', 'env-id')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.USER.NOT_FOUND.code,
        ),
      );
    });
  });

  describe('listUsers', () => {
    it('should return paginated users with no expand', async () => {
      const mockUsers = [
        {
          externalId: 'test-id-1',
          data: { name: 'User 1' },
          createdAt: new Date(),
          bizUsersOnCompany: [],
        },
        {
          externalId: 'test-id-2',
          data: { name: 'User 2' },
          createdAt: new Date(),
          bizUsersOnCompany: [],
        },
      ];

      mockPrismaService.bizUser.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.bizUser.count.mockResolvedValue(2);

      const result = await service.listUsers('env-id', undefined, 2);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        id: 'test-id-1',
        object: 'user',
        attributes: { name: 'User 1' },
        createdAt: mockUsers[0].createdAt.toISOString(),
        companies: null,
        memberships: null,
      });
    });

    it('should return paginated users with memberships.company expand', async () => {
      const mockUsers = [
        {
          externalId: 'test-id-1',
          data: { name: 'User 1' },
          createdAt: new Date(),
          bizUsersOnCompany: [
            {
              id: 'membership-1',
              data: { role: 'admin' },
              createdAt: new Date(),
              bizCompanyId: 'company-1',
              bizUserId: 'user-1',
              bizCompany: {
                externalId: 'company-1',
                data: { name: 'company 1' },
                createdAt: new Date(),
              },
            },
          ],
        },
      ];

      mockPrismaService.bizUser.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.bizUser.count.mockResolvedValue(1);

      const result = await service.listUsers('env-id', undefined, 1, [
        ExpandType.MEMBERSHIPS_COMPANY,
      ]);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].memberships).toEqual([
        {
          id: 'membership-1',
          object: 'company_membership',
          attributes: { role: 'admin' },
          createdAt: mockUsers[0].bizUsersOnCompany[0].createdAt.toISOString(),
          companyId: 'company-1',
          userId: 'user-1',
          company: {
            id: 'company-1',
            object: 'company',
            attributes: { name: 'company 1' },
            createdAt: mockUsers[0].bizUsersOnCompany[0].bizCompany.createdAt.toISOString(),
          },
        },
      ]);
    });
  });
});
