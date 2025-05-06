import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIUsersController } from './users.controller';
import { OpenAPIUsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';
import { ExpandType, GetUserQueryDto, ListUsersQueryDto, UserOrderByType } from './users.dto';
import { InvalidLimitError, InvalidCursorError } from '@/common/errors/errors';

describe('OpenAPIUsersController', () => {
  let controller: OpenAPIUsersController;
  let service: OpenAPIUsersService;

  const mockEnvironment: Environment = {
    id: 'env1',
    projectId: 'project1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequestUrl = 'http://localhost:3000/v1/users';

  const mockUsersService = {
    getUser: jest.fn(),
    listUsers: jest.fn().mockResolvedValue({
      results: [
        {
          id: 'user1',
          object: 'user',
          attributes: { name: 'Test User' },
          createdAt: new Date().toISOString(),
        },
      ],
      next: null,
      previous: null,
    }),
    upsertUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://docs.usertour.com'),
  };

  const mockPrismaService = {
    accessToken: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'token1',
        token: 'test-token',
        isActive: true,
        environment: mockEnvironment,
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIUsersController],
      providers: [
        {
          provide: OpenAPIUsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
      ],
    })
      .overrideGuard(OpenAPIKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideFilter(OpenAPIExceptionFilter)
      .useValue({ catch: jest.fn() })
      .compile();

    controller = module.get<OpenAPIUsersController>(OpenAPIUsersController);
    service = module.get<OpenAPIUsersService>(OpenAPIUsersService);
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user1',
        object: 'user',
        attributes: {},
        createdAt: new Date().toISOString(),
      };

      mockUsersService.getUser.mockResolvedValue(mockUser);

      const query: GetUserQueryDto = {
        expand: [ExpandType.COMPANIES],
      };

      const result = await controller.getUser('user1', 'env1', query);

      expect(result).toEqual(mockUser);
      expect(service.getUser).toHaveBeenCalledWith('user1', 'env1', query);
    });
  });

  describe('listUsers', () => {
    it('should return a list of users', async () => {
      const mockUsers = {
        results: [
          {
            id: 'user1',
            object: 'user',
            attributes: { name: 'Test User' },
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockUsersService.listUsers.mockResolvedValue(mockUsers);

      const query: ListUsersQueryDto = {
        limit: 10,
        cursor: 'cursor1',
        orderBy: [UserOrderByType.CREATED_AT],
        expand: [ExpandType.COMPANIES],
        email: 'test@example.com',
        companyId: 'company1',
        segmentId: 'segment1',
      };

      const result = await controller.listUsers(mockRequestUrl, mockEnvironment, query);

      expect(result).toEqual(mockUsers);
      expect(service.listUsers).toHaveBeenCalledWith(mockRequestUrl, mockEnvironment, query);
    });

    it('should handle invalid limit', async () => {
      mockUsersService.listUsers.mockRejectedValue(new InvalidLimitError());

      const query: ListUsersQueryDto = {
        limit: -1,
      };

      await expect(controller.listUsers(mockRequestUrl, mockEnvironment, query)).rejects.toThrow(
        InvalidLimitError,
      );
    });

    it('should handle invalid cursor', async () => {
      mockUsersService.listUsers.mockRejectedValue(new InvalidCursorError());

      const query: ListUsersQueryDto = {
        limit: 10,
        cursor: 'invalid-cursor',
      };

      await expect(controller.listUsers(mockRequestUrl, mockEnvironment, query)).rejects.toThrow(
        InvalidCursorError,
      );
    });
  });

  describe('upsertUser', () => {
    it('should upsert user', async () => {
      const mockUser = {
        id: 'user1',
        object: 'user',
        attributes: {},
        createdAt: new Date().toISOString(),
      };

      const mockData = {
        id: 'user1',
        attributes: {},
        companies: [],
      };

      mockUsersService.upsertUser.mockResolvedValue(mockUser);

      const result = await controller.upsertUser(mockData, 'env1');

      expect(result).toEqual(mockUser);
      expect(service.upsertUser).toHaveBeenCalledWith(mockData, 'env1');
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return success response', async () => {
      const mockResponse = {
        id: 'user1',
        object: 'user',
        deleted: true,
      };

      mockUsersService.deleteUser.mockResolvedValue(mockResponse);

      const result = await controller.deleteUser('user1', 'env1');

      expect(result).toEqual(mockResponse);
      expect(service.deleteUser).toHaveBeenCalledWith('user1', 'env1');
    });
  });
});
