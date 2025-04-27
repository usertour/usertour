import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIUsersService } from './users.service';
import { BizService } from '@/biz/biz.service';
import { ConfigService } from '@nestjs/config';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { ExpandType } from './users.dto';

describe('OpenAPIUsersService', () => {
  let service: OpenAPIUsersService;
  let bizService: BizService;

  const mockBizService = {
    getBizUser: jest.fn(),
    listBizUsers: jest.fn(),
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
      expect(bizService.getBizUser).toHaveBeenCalledWith('user1', 'env1', [ExpandType.COMPANIES]);
    });

    it('should throw not found error when user does not exist', async () => {
      mockBizService.getBizUser.mockResolvedValue(null);

      await expect(service.getUser('user1', 'env1')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.USER.NOT_FOUND.code,
        ),
      );
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const mockBizUsers = [
        {
          externalId: 'user1',
          data: {},
          createdAt: new Date(),
          bizUsersOnCompany: [],
        },
      ];

      mockBizService.listBizUsers.mockResolvedValue({
        results: mockBizUsers,
        nextCursor: null,
        previousCursor: null,
      });

      const result = await service.listUsers('env1', undefined, 20, [ExpandType.COMPANIES]);

      expect(result).toEqual({
        results: [
          {
            id: 'user1',
            object: 'user',
            attributes: {},
            createdAt: mockBizUsers[0].createdAt.toISOString(),
            companies: [],
            memberships: null,
          },
        ],
        next: null,
        previous: null,
      });
      expect(bizService.listBizUsers).toHaveBeenCalledWith('env1', undefined, 20, [
        ExpandType.COMPANIES,
      ]);
    });

    it('should handle pagination parameters', async () => {
      const mockBizUsers = [
        {
          externalId: 'user1',
          data: {},
          createdAt: new Date(),
          bizUsersOnCompany: [],
        },
      ];

      mockBizService.listBizUsers.mockResolvedValue({
        results: mockBizUsers,
        nextCursor: 'next_cursor',
        previousCursor: 'previous_cursor',
      });

      const cursor = 'current_cursor';
      const limit = 10;

      const result = await service.listUsers('env1', cursor, limit, [ExpandType.COMPANIES]);

      expect(result).toEqual({
        results: [
          {
            id: 'user1',
            object: 'user',
            attributes: {},
            createdAt: mockBizUsers[0].createdAt.toISOString(),
            companies: [],
            memberships: null,
          },
        ],
        next: 'http://localhost:3000/v1/users?cursor=next_cursor',
        previous: 'http://localhost:3000/v1/users?cursor=previous_cursor',
      });
      expect(bizService.listBizUsers).toHaveBeenCalledWith('env1', cursor, limit, [
        ExpandType.COMPANIES,
      ]);
    });

    it('should throw error when limit is invalid', async () => {
      await expect(service.listUsers('env1', undefined, -1)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.USER.INVALID_LIMIT.code,
        ),
      );
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

      await expect(service.upsertUser(mockData, 'env1')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.USER.INVALID_REQUEST.code,
        ),
      );
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
