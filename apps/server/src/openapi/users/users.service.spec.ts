import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIUsersService } from './users.service';
import { BizService } from '@/biz/biz.service';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundError, InvalidLimitError, InvalidRequestError } from '@/common/errors/errors';
import { ExpandType } from './users.dto';
import { OpenApiObjectType } from '@/common/openapi/types';

describe('OpenAPIUsersService', () => {
  let service: OpenAPIUsersService;
  let bizService: BizService;

  const mockBizService = {
    getBizUser: jest.fn(),
    listBizUsersWithRelations: jest.fn(),
    upsertUser: jest.fn(),
    deleteBizUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'app.apiUrl':
          return 'http://localhost:3000';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIUsersService,
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

    service = module.get<OpenAPIUsersService>(OpenAPIUsersService);
    bizService = module.get<BizService>(BizService);
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return user by ID', async () => {
      const mockBizUser = {
        externalId: 'user1',
        data: {},
        createdAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockBizService.getBizUser.mockResolvedValue(mockBizUser);

      const result = await service.getUser('user1', 'env1', [ExpandType.COMPANIES]);

      expect(result).toEqual({
        id: 'user1',
        object: 'user',
        attributes: {},
        createdAt: mockBizUser.createdAt.toISOString(),
        companies: [],
        memberships: null,
      });
      expect(bizService.getBizUser).toHaveBeenCalledWith('user1', 'env1', { companies: true });
    });

    it('should throw not found error when user does not exist', async () => {
      mockBizService.getBizUser.mockResolvedValue(null);

      await expect(service.getUser('user1', 'env1')).rejects.toThrow(new UserNotFoundError());
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const mockBizUser = {
        externalId: 'user1',
        data: {},
        createdAt: new Date('2025-04-27T10:56:52.198Z'),
        bizUsersOnCompany: [],
      };

      mockBizService.listBizUsersWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockBizUser,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
      });

      const result = await service.listUsers('env1', 20, undefined, [ExpandType.COMPANIES]);

      expect(result).toEqual({
        results: [
          {
            id: 'user1',
            object: 'user',
            attributes: {},
            createdAt: '2025-04-27T10:56:52.198Z',
            companies: [],
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      });
      expect(bizService.listBizUsersWithRelations).toHaveBeenCalledWith(
        'env1',
        { first: 20 },
        { companies: true, bizUsersOnCompany: false },
      );
    });

    it('should handle cursor pagination', async () => {
      const mockBizUser = {
        externalId: 'user1',
        data: {},
        createdAt: new Date('2025-04-27T10:56:52.198Z'),
        bizUsersOnCompany: [
          {
            bizCompany: {
              externalId: 'company1',
              data: {},
              createdAt: new Date('2025-04-27T10:56:52.198Z'),
            },
          },
        ],
      };

      mockBizService.listBizUsersWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockBizUser,
            cursor: 'cursor2',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor2',
          endCursor: 'cursor2',
        },
      });

      const result = await service.listUsers('env1', 10, 'cursor1', [ExpandType.COMPANIES]);

      expect(result).toEqual({
        results: [
          {
            id: 'user1',
            object: OpenApiObjectType.USER,
            attributes: {},
            createdAt: '2025-04-27T10:56:52.198Z',
            companies: [
              {
                id: 'company1',
                object: OpenApiObjectType.COMPANY,
                attributes: {},
                createdAt: '2025-04-27T10:56:52.198Z',
              },
            ],
            memberships: null,
          },
        ],
        next: 'http://localhost:3000/v1/users?cursor=cursor2&limit=10&expand%5B%5D=companies',
        previous: 'http://localhost:3000/v1/users?limit=10&expand%5B%5D=companies',
      });

      expect(bizService.listBizUsersWithRelations).toHaveBeenCalledWith(
        'env1',
        { first: 10, after: 'cursor1' },
        { companies: true, bizUsersOnCompany: false },
      );
    });

    it('should throw error when limit is invalid', async () => {
      await expect(service.listUsers('env1', -1)).rejects.toThrow(new InvalidLimitError());
    });
  });

  describe('upsertUser', () => {
    it('should upsert user', async () => {
      const mockData = {
        id: 'user1',
        attributes: {},
        companies: [],
      };

      const mockBizUser = {
        externalId: 'user1',
        data: {},
        createdAt: new Date(),
        bizUsersOnCompany: [],
      };

      mockBizService.upsertUser.mockResolvedValue(mockBizUser);
      mockBizService.getBizUser.mockResolvedValue(mockBizUser);

      const result = await service.upsertUser(mockData, 'env1');

      expect(result).toEqual({
        id: 'user1',
        object: 'user',
        attributes: {},
        createdAt: mockBizUser.createdAt.toISOString(),
        companies: null,
        memberships: null,
      });
      expect(bizService.upsertUser).toHaveBeenCalledWith('user1', mockData, 'env1');
    });

    it('should throw error when both companies and memberships are set', async () => {
      const mockData = {
        id: 'user1',
        attributes: {},
        companies: [],
        memberships: [],
      };

      await expect(service.upsertUser(mockData, 'env1')).rejects.toThrow(new InvalidRequestError());
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return success response', async () => {
      mockBizService.deleteBizUser.mockResolvedValue(undefined);

      const result = await service.deleteUser('user1', 'env1');

      expect(result).toEqual({
        id: 'user1',
        object: 'user',
        deleted: true,
      });
      expect(bizService.deleteBizUser).toHaveBeenCalledWith(['user1'], 'env1');
    });
  });
});
