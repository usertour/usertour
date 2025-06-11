import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIUsersService } from './users.service';
import { BizService } from '@/biz/biz.service';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundError, InvalidLimitError, InvalidRequestError } from '@/common/errors/errors';
import { ExpandType, GetUserQueryDto, ListUsersQueryDto, UpsertUserRequestDto } from './users.dto';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';
import { UserOrderByType } from './users.dto';

describe('OpenAPIUsersService', () => {
  let service: OpenAPIUsersService;
  let bizService: BizService;

  const mockEnvironment: Environment = {
    id: 'env1',
    projectId: 'project1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBizUser = {
    id: 'user1',
    externalId: 'user1',
    data: { name: 'Test User' },
    createdAt: new Date(),
    bizUsersOnCompany: [],
    memberships: null,
  };

  const mockBizUserWithCompanies = {
    id: 'user1',
    externalId: 'user1',
    data: { name: 'Test User' },
    createdAt: new Date(),
    bizUsersOnCompany: [
      {
        id: 'membership1',
        bizCompany: {
          id: 'company1',
          externalId: 'company1',
          data: { name: 'Test Company' },
          createdAt: new Date(),
        },
      },
    ],
    memberships: null,
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockBizService = {
    getBizUser: jest.fn(),
    listBizUsersWithRelations: jest.fn(),
    upsertUser: jest.fn(),
    deleteBizUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIUsersService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BizService,
          useValue: mockBizService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIUsersService>(OpenAPIUsersService);
    bizService = module.get<BizService>(BizService);
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return a user', async () => {
      mockBizService.getBizUser.mockResolvedValue(mockBizUser);

      const result = await service.getUser('user1', 'env1');

      expect(result).toEqual({
        id: 'user1',
        object: OpenApiObjectType.USER,
        attributes: { name: 'Test User' },
        createdAt: mockBizUser.createdAt.toISOString(),
        companies: null,
        memberships: null,
      });
      expect(bizService.getBizUser).toHaveBeenCalledWith('user1', 'env1', {
        bizUsersOnCompany: {
          include: {
            bizCompany: true,
          },
        },
      });
    });

    it('should return a user with expanded companies', async () => {
      mockBizService.getBizUser.mockResolvedValue(mockBizUserWithCompanies);

      const query: GetUserQueryDto = {
        expand: [ExpandType.COMPANIES],
      };

      const result = await service.getUser('user1', 'env1', query);

      expect(result).toEqual({
        id: 'user1',
        object: OpenApiObjectType.USER,
        attributes: { name: 'Test User' },
        createdAt: mockBizUserWithCompanies.createdAt.toISOString(),
        companies: [
          {
            id: 'company1',
            object: OpenApiObjectType.COMPANY,
            attributes: { name: 'Test Company' },
            createdAt:
              mockBizUserWithCompanies.bizUsersOnCompany[0].bizCompany.createdAt.toISOString(),
          },
        ],
        memberships: null,
      });
      expect(bizService.getBizUser).toHaveBeenCalledWith('user1', 'env1', {
        bizUsersOnCompany: {
          include: {
            bizCompany: true,
          },
        },
      });
    });

    it('should throw error when user not found', async () => {
      mockBizService.getBizUser.mockResolvedValue(null);

      await expect(service.getUser('non-existent', 'env1')).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      mockBizService.listBizUsersWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockBizUser,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: 'next-cursor',
        },
      });

      const query: ListUsersQueryDto = {
        limit: 20,
        expand: [ExpandType.COMPANIES],
        orderBy: [UserOrderByType.CREATED_AT],
        email: 'test@example.com',
        companyId: 'company1',
        segmentId: 'segment1',
      };

      const result = await service.listUsers(
        'http://localhost:3000/v1/users',
        mockEnvironment,
        query,
      );

      expect(result).toEqual({
        results: [
          {
            id: 'user1',
            object: OpenApiObjectType.USER,
            attributes: { name: 'Test User' },
            createdAt: mockBizUser.createdAt.toISOString(),
            companies: [],
            memberships: null,
          },
        ],
        next: 'http://localhost:3000/v1/users?cursor=next-cursor&limit=20&expand%5B%5D=companies',
        previous: null,
      });
      expect(bizService.listBizUsersWithRelations).toHaveBeenCalledWith(
        'env1',
        { first: 20, after: undefined },
        {
          bizUsersOnCompany: {
            include: {
              bizCompany: true,
            },
          },
        },
        [{ createdAt: 'asc' }],
        'test@example.com',
        'company1',
        'segment1',
      );
    });

    it('should return paginated users with cursor', async () => {
      mockBizService.listBizUsersWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockBizUser,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: 'next-cursor',
        },
      });

      const query: ListUsersQueryDto = {
        limit: 10,
        cursor: 'cursor1',
        expand: [ExpandType.COMPANIES],
        orderBy: [UserOrderByType.CREATED_AT],
        email: 'test@example.com',
        companyId: 'company1',
        segmentId: 'segment1',
      };

      const result = await service.listUsers(
        'http://localhost:3000/v1/users',
        mockEnvironment,
        query,
      );

      expect(result).toEqual({
        results: [
          {
            id: 'user1',
            object: OpenApiObjectType.USER,
            attributes: { name: 'Test User' },
            createdAt: mockBizUser.createdAt.toISOString(),
            companies: [],
            memberships: null,
          },
        ],
        next: 'http://localhost:3000/v1/users?cursor=next-cursor&limit=10&expand%5B%5D=companies',
        previous: 'http://localhost:3000/v1/users?limit=10&expand%5B%5D=companies',
      });
      expect(bizService.listBizUsersWithRelations).toHaveBeenCalledWith(
        'env1',
        { first: 10, after: 'cursor1' },
        {
          bizUsersOnCompany: {
            include: {
              bizCompany: true,
            },
          },
        },
        [{ createdAt: 'asc' }],
        'test@example.com',
        'company1',
        'segment1',
      );
    });

    it('should throw error for invalid limit', async () => {
      const query: ListUsersQueryDto = {
        limit: -1,
      };

      await expect(
        service.listUsers('http://localhost:3000/v1/users', mockEnvironment, query),
      ).rejects.toThrow(new InvalidLimitError());
    });
  });

  describe('upsertUser', () => {
    it('should upsert user', async () => {
      const mockData: UpsertUserRequestDto = {
        id: 'user1',
        attributes: {},
        companies: [],
        memberships: null,
      };

      mockBizService.upsertUser.mockResolvedValue(mockBizUser);
      mockBizService.getBizUser.mockResolvedValue(mockBizUser);

      const result = await service.upsertUser(mockData, 'env1');

      expect(result).toEqual({
        id: 'user1',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: mockBizUser.createdAt.toISOString(),
        companies: null,
        memberships: null,
      });
      expect(bizService.upsertUser).toHaveBeenCalledWith('user1', 'env1', {}, [], null);
    });

    it('should handle memberships', async () => {
      const mockData: UpsertUserRequestDto = {
        id: 'user1',
        attributes: {},
        companies: null,
        memberships: [
          {
            company: {
              id: 'company1',
              attributes: {},
            },
            attributes: {},
          },
        ],
      };

      mockBizService.upsertUser.mockResolvedValue(mockBizUser);
      mockBizService.getBizUser.mockResolvedValue(mockBizUser);

      const result = await service.upsertUser(mockData, 'env1');

      expect(result).toEqual({
        id: 'user1',
        object: 'user',
        attributes: { name: 'Test User' },
        createdAt: mockBizUser.createdAt.toISOString(),
        companies: null,
        memberships: null,
      });
      expect(bizService.upsertUser).toHaveBeenCalledWith('user1', 'env1', {}, null, [
        {
          company: {
            id: 'company1',
            attributes: {},
          },
          attributes: {},
        },
      ]);
    });

    it('should throw error when both companies and memberships are set', async () => {
      const mockData: UpsertUserRequestDto = {
        id: 'user1',
        attributes: {},
        companies: [{ id: 'company1', attributes: {} }],
        memberships: [
          {
            company: {
              id: 'company2',
              attributes: {},
            },
            attributes: {},
          },
        ],
      };

      mockBizService.upsertUser.mockRejectedValue(new InvalidRequestError());

      await expect(service.upsertUser(mockData, 'env1')).rejects.toThrow(new InvalidRequestError());
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return success response', async () => {
      const mockBizUser = {
        id: 'biz-user-1',
        externalId: 'user1',
        data: {},
        createdAt: new Date(),
      };
      mockBizService.getBizUser.mockResolvedValue(mockBizUser);
      mockBizService.deleteBizUser.mockResolvedValue(undefined);

      const result = await service.deleteUser('user1', 'env1');

      expect(result).toEqual({
        id: 'user1',
        object: 'user',
        deleted: true,
      });
      expect(bizService.getBizUser).toHaveBeenCalledWith('user1', 'env1');
      expect(bizService.deleteBizUser).toHaveBeenCalledWith(['biz-user-1'], 'env1');
    });

    it('should throw error when user not found', async () => {
      mockBizService.getBizUser.mockResolvedValue(null);

      await expect(service.deleteUser('non-existent', 'env1')).rejects.toThrow(UserNotFoundError);
    });
  });
});
