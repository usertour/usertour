import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIUsersController } from './users.controller';
import { OpenAPIUsersService } from './users.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';

describe('OpenAPIUsersController', () => {
  let controller: OpenAPIUsersController;
  let usersService: OpenAPIUsersService;

  const mockUsersService = {
    getUser: jest.fn(),
    listUsers: jest.fn(),
    upsertUser: jest.fn(),
    deleteUser: jest.fn(),
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
          provide: PrismaService,
          useValue: {},
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
        OpenapiGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPIUsersController>(OpenAPIUsersController);
    usersService = module.get<OpenAPIUsersService>(OpenAPIUsersService);
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

      const result = await controller.getUser('user1', 'env1', 'companies');

      expect(result).toEqual(mockUser);
      expect(usersService.getUser).toHaveBeenCalledWith('user1', 'env1', ['companies']);
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const mockResponse = {
        results: [
          {
            id: 'user1',
            object: 'user',
            attributes: {},
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockUsersService.listUsers.mockResolvedValue(mockResponse);

      const result = await controller.listUsers('env1', undefined, 20, 'companies');

      expect(result).toEqual(mockResponse);
      expect(usersService.listUsers).toHaveBeenCalledWith('env1', undefined, 20, ['companies']);
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        results: [
          {
            id: 'user1',
            object: 'user',
            attributes: {},
            createdAt: new Date().toISOString(),
          },
        ],
        next: 'next_cursor',
        previous: null,
      };

      mockUsersService.listUsers.mockResolvedValue(mockResponse);

      const cursor = 'current_cursor';
      const limit = 10;

      const result = await controller.listUsers('env1', cursor, limit, 'companies');

      expect(result).toEqual(mockResponse);
      expect(usersService.listUsers).toHaveBeenCalledWith('env1', cursor, limit, ['companies']);
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
      expect(usersService.upsertUser).toHaveBeenCalledWith(mockData, 'env1');
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
      expect(usersService.deleteUser).toHaveBeenCalledWith('user1', 'env1');
    });
  });
});
